// Pure reverse link-index + wiki-link target resolver for backlinks (T-4.1,
// M4.1). This is the wiki-link **resolver** deferred from Phase 3 (T-3.4 /
// ADR-0018): it maps a `[[target]]` to the workspace note(s) it points at.
//
// Sprint 6 (ADR-0024) additively widens this module to also resolve standard
// Markdown links (`[text](./note.md)`). `NoteLink` and `Backlink` gain an
// optional `kind` field (`"wiki" | "markdown"`); when absent / `"wiki"` the
// behaviour matches the pre-Sprint-6 shape *exactly* so every M4.1 / T-4.1b /
// M4.2 / M4.4 test passes unchanged. Sprint 6 also promotes heading anchors
// (`#heading` on either link kind) to a `targetLine` in the *target* note,
// resolved via `findHeadingLine` against the target's text and cached per
// `(targetPath, heading)` pair for the lifetime of one build.
//
// This module imports nothing from `vscode` or the file system — it operates on
// plain data so it is unit-testable without booting VS Code (the
// `LinkIndexService` does the I/O and feeds parsed notes in). Note identity is a
// stable POSIX-style path string (e.g. a workspace-relative path); the service
// keeps the path → URI mapping.

import { findHeadingLine } from "../outline/headings";

//
// Wiki-link resolution rules (M4.1, plan §4):
//   * Case-insensitive **basename** matching: `[[Guide]]` matches `Guide.md`
//     anywhere in the workspace.
//   * Path-qualified targets (`[[docs/Guide]]`) resolve **relative to the
//     source note first**; if no such file exists, fall back to basename.
//   * An ambiguous basename links **all** matching notes (no error).
//   * A note never backlinks itself.
//
// Markdown-link resolution rules (T-4.1a, ADR-0024 §"Decision"):
//   * **Explicit-path only — no basename fallback.** Markdown links are
//     author-explicit paths; fuzzy matching is the wiki affordance.
//   * Resolved by `joinPath(dirname(sourcePath), destination)` then normalised
//     (`..`/`.` segments collapsed) and looked up case-insensitively.
//   * A miss is a drop, not a fallback (the author can switch to `[[…]]` for
//     fuzzy matching).

// A wiki-link or Markdown-link extracted from a source note, with the snippet
// for display. `kind` is optional and defaults to `"wiki"` for backwards
// compatibility (pre-Sprint-6 callers never set it).
export interface NoteLink {
  // The raw target (before `#`/`|` for wiki, the destination path for
  // Markdown), trimmed.
  readonly target: string;
  // The heading anchor after `#`, or `null`. Captured here; heading-line
  // resolution is the consumer's concern (T-4.1c, Phase C).
  readonly heading: string | null;
  // 0-based line index of the link in the source note.
  readonly line: number;
  // The trimmed source line containing the link (for the tree label/tooltip).
  readonly snippet: string;
  // Discriminator for the resolver path. Optional: `undefined` is treated as
  // `"wiki"` (the pre-Sprint-6 shape).
  readonly kind?: "wiki" | "markdown";
}

// A parsed source note: its stable path, its full text (so the build pass can
// resolve heading anchors in the *target* note via `findHeadingLine` — T-4.1c),
// and the links it contains. `text` is **optional** for backwards compatibility
// with pre-Sprint-6 fixtures: when omitted, heading-line promotion is skipped
// and the backlink remains at the file level (matching the M4.2 hover-preview
// "unresolved heading → top-of-note" policy).
export interface ParsedNote {
  // Stable identifier for the note (POSIX-style path string).
  readonly path: string;
  // Full source text — used by the build pass to resolve link headings to a
  // line in *this* note when another note backlinks `…#heading`. Optional so
  // existing fixtures and tests do not have to thread text through.
  readonly text?: string;
  readonly links: ReadonlyArray<NoteLink>;
}

// A single backlink: a source note linking *to* the queried note. `kind` is
// emitted on the returned object only for Markdown-link backlinks, so the
// pre-Sprint-6 shape (`{ sourcePath, line, snippet, heading }`) is preserved
// byte-for-byte for wiki-only inputs and every M4.1 / T-4.1b / M4.2 / M4.4
// `assert.deepEqual` continues to pass without modification. `targetLine` is
// emitted only when the backlink's `heading` resolves to a heading in the
// target note (T-4.1c): a number when the heading was found, `null` when the
// lookup ran but missed. Omitted entirely when no lookup ran (no heading on
// the link, or the target note's text was not supplied).
export interface Backlink {
  // The path of the note that contains the link.
  readonly sourcePath: string;
  // 0-based line of the link in the source note.
  readonly line: number;
  // The trimmed source line containing the link.
  readonly snippet: string;
  // The heading anchor the link targeted, or `null`.
  readonly heading: string | null;
  // Discriminator. Present only when the source link was a Markdown link;
  // omitted (not `undefined`) for wiki-link backlinks so deep-equal against
  // the pre-Sprint-6 shape still holds.
  readonly kind?: "wiki" | "markdown";
  // The 0-based line of the target heading in the target note, when the
  // backlink's `heading` resolved (T-4.1c). `null` is a found-but-missed
  // heading; the field is absent entirely when no lookup ran.
  readonly targetLine?: number | null;
}

// A directed graph edge between two workspace notes (M4.4). `from` and `to` are
// canonical note paths (the same identity `backlinksFor`/`resolveForward` use).
// Self-edges are excluded (a note never links to itself). Multi-links between
// the same pair are collapsed: `weight` is the number of `[[…]]` occurrences in
// the source note that resolve to the target, so `A → B` appears at most once
// per ordered pair.
export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

// The built reverse index. `backlinksFor(path)` returns every note that links
// to the note at `path`, sorted for stable display. `resolveForward(fromPath,
// target)` is the same resolver the index builds backlinks with, exposed for
// in-preview wiki-link navigation (T-4.1b) so the panel and click-navigation
// share one resolution implementation (no parallel logic). `allEdges()` is
// the deduped (from→to) view the M4.4 graph builds on (the same data the
// backlink loop produces, served forward instead of reverse).
export interface LinkIndex {
  backlinksFor(path: string): Backlink[];
  resolveForward(fromPath: string, target: string): string[];
  allEdges(): GraphEdge[];
}

const MD_EXTENSION = /\.(md|markdown)$/i;

// Sentinel for "looked up, missed" in the per-build heading-line cache (the
// cache stores numbers; a found heading is `>= 0`, a miss is recorded as `-1`
// to keep the value space numeric — converted to `null` on the way out).
const HEADING_LINE_MISS = -1;

// Build a reverse index over `notes`. O(total links): each link is resolved to
// its target note(s) once and bucketed under the resolved path. Heading-line
// resolution (T-4.1c) is cached per `(targetPath, heading)` pair for the
// duration of this build so a heavily-linked heading is not re-scanned per
// backlink. The cache lives in this closure (not on the service) so each
// watcher-driven rebuild rebuilds it — stale heading lines are structurally
// impossible.
export function buildLinkIndex(notes: ReadonlyArray<ParsedNote>): LinkIndex {
  // Lowercased-path → canonical path, for case-insensitive membership tests.
  const canonicalByLowerPath = new Map<string, string>();
  // Basename key → canonical paths sharing it (ambiguous basenames link all).
  const pathsByBasename = new Map<string, string[]>();
  // Canonical path → note text, so the heading-line cache can run
  // `findHeadingLine(targetText, heading)` against the *target* note (the
  // note being linked to, not the note containing the link). Notes without
  // `text` (legacy fixtures) skip heading promotion.
  const textByPath = new Map<string, string>();
  // Per-build cache for `findHeadingLine`. Key = `${targetPath}\u0000${heading}`.
  // The cache returns: `-1` on miss (lookup ran, heading not found), `>= 0`
  // on hit. The build pass converts `-1` → `null` for the surfaced backlink.
  const headingLineCache = new Map<string, number>();

  for (const note of notes) {
    canonicalByLowerPath.set(note.path.toLowerCase(), note.path);
    const key = basenameKey(note.path);
    const bucket = pathsByBasename.get(key);
    if (bucket) {
      bucket.push(note.path);
    } else {
      pathsByBasename.set(key, [note.path]);
    }
    if (typeof note.text === "string") {
      textByPath.set(note.path, note.text);
    }
  }

  // Lowercased target path → backlinks pointing at it.
  const reverse = new Map<string, Backlink[]>();

  // Deduped (from→to) edges for the M4.4 graph view. Keyed by a stable
  // `${fromLower}\u0000${toLower}` so multi-links between the same pair
  // collapse to one edge with `weight` counting their occurrences.
  const edges = new Map<string, { from: string; to: string; weight: number }>();

  for (const note of notes) {
    for (const link of note.links) {
      const kind = link.kind ?? "wiki";
      const targetPaths =
        kind === "markdown"
          ? resolveMarkdownTarget(note.path, link.target, canonicalByLowerPath)
          : resolveTarget(
              note.path,
              link.target,
              canonicalByLowerPath,
              pathsByBasename
            );
      for (const targetPath of targetPaths) {
        // A note never backlinks (or self-edges) to itself.
        if (targetPath.toLowerCase() === note.path.toLowerCase()) {
          continue;
        }
        const lowerTarget = targetPath.toLowerCase();
        const bucket = reverse.get(lowerTarget);
        // Resolve the target heading to a line in the *target* note (T-4.1c).
        // Skipped when the link has no heading or the target note's text was
        // not supplied (legacy fixtures) — the backlink then remains
        // file-level with `targetLine` omitted.
        const targetLine =
          link.heading !== null
            ? resolveHeadingLineCached(
                targetPath,
                link.heading,
                textByPath,
                headingLineCache
              )
            : undefined;
        const backlink = composeBacklink(note.path, link, kind, targetLine);
        if (bucket) {
          bucket.push(backlink);
        } else {
          reverse.set(lowerTarget, [backlink]);
        }

        // Dedupe edges: one entry per ordered (from, to) pair, incrementing
        // `weight` for repeats so the graph can render a heavier line for
        // multi-linked pairs without showing parallel edges.
        const edgeKey = `${note.path.toLowerCase()}\u0000${lowerTarget}`;
        const existing = edges.get(edgeKey);
        if (existing) {
          existing.weight += 1;
        } else {
          edges.set(edgeKey, {
            from: note.path,
            to: targetPath,
            weight: 1
          });
        }
      }
    }
  }

  return {
    backlinksFor(path: string): Backlink[] {
      const bucket = reverse.get(path.toLowerCase());
      return bucket ? dedupeAndSort(bucket) : [];
    },
    // Forward resolution for in-preview navigation (T-4.1b): the note path(s)
    // a `target` written in `fromPath` points at. Unlike the backlink build
    // loop this does **not** drop a self-match — clicking `[[A]]` inside A
    // should still resolve to A. Ambiguous basenames return all matches in
    // index order; the caller opens the first.
    resolveForward(fromPath: string, target: string): string[] {
      return resolveTarget(
        fromPath,
        target,
        canonicalByLowerPath,
        pathsByBasename
      );
    },
    // Every resolved (from→to) edge in the workspace, deduped per ordered
    // pair with `weight` counting how many `[[…]]` occurrences in `from`
    // resolve to `to` (M4.4 graph view). Self-edges are excluded, matching
    // the backlink rule. Ordering is the order edges were first observed
    // (stable across rebuilds because notes are iterated in input order).
    allEdges(): GraphEdge[] {
      return [...edges.values()];
    }
  };
}

// Resolve a wiki-link `target` (as written in `sourcePath`) to the note path(s)
// it points at. Returns an empty array when nothing matches.
function resolveTarget(
  sourcePath: string,
  target: string,
  canonicalByLowerPath: Map<string, string>,
  pathsByBasename: Map<string, string[]>
): string[] {
  const trimmed = target.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // Path-qualified target: resolve relative to the source note's directory
  // first (Producer decision). Only when that yields no existing note do we
  // fall back to basename matching below.
  if (trimmed.includes("/")) {
    const candidate = normalizePath(
      joinPath(dirname(sourcePath), ensureMdExtension(trimmed))
    );
    const canonical = canonicalByLowerPath.get(candidate.toLowerCase());
    if (canonical) {
      return [canonical];
    }
  }

  return pathsByBasename.get(basenameKey(trimmed)) ?? [];
}

// Resolve a standard Markdown-link destination (as written in `sourcePath`)
// to the note path it points at. **Explicit-path only — no basename fallback.**
// Returns an empty array when the destination does not exist in the index.
//
// The destination has already been cleaned by `parseMarkdownTargets`: no URL
// scheme, no leading `/`, no `?query`/`#anchor`, no `<…>` wrapping, and the
// extension is `.md` or `.markdown`. This helper does the path arithmetic.
function resolveMarkdownTarget(
  sourcePath: string,
  destination: string,
  canonicalByLowerPath: Map<string, string>
): string[] {
  const trimmed = destination.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const candidate = normalizePath(joinPath(dirname(sourcePath), trimmed));
  const canonical = canonicalByLowerPath.get(candidate.toLowerCase());
  return canonical ? [canonical] : [];
}

// The resolution key for a path or target: its last segment, with a trailing
// `.md`/`.markdown` stripped, lowercased. `docs/Guide.md` and `[[Guide]]` both
// key to `guide`.
function basenameKey(path: string): string {
  const segment = basename(path);
  return segment.replace(MD_EXTENSION, "").toLowerCase();
}

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

function dirname(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

function ensureMdExtension(target: string): string {
  return MD_EXTENSION.test(target) ? target : `${target}.md`;
}

function joinPath(dir: string, rel: string): string {
  return dir.length === 0 ? rel : `${dir}/${rel}`;
}

// Resolve `.`/`..`/empty segments in a POSIX-style path. A `..` that climbs
// past the root is dropped (the path stays anchored at the root).
function normalizePath(path: string): string {
  const out: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/");
}

// Collapse backlinks that point at the same source line (e.g. two links to the
// same note on one line) and order them by source path then line for a stable
// tree. The snippet is the whole line, so per-line grouping is the right grain.
function dedupeAndSort(backlinks: ReadonlyArray<Backlink>): Backlink[] {
  const seen = new Set<string>();
  const unique: Backlink[] = [];
  for (const backlink of backlinks) {
    const id = `${backlink.sourcePath.toLowerCase()}\u0000${backlink.line}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(backlink);
  }
  return unique.sort(
    (a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.line - b.line
  );
}

// Build a `Backlink` from a source `NoteLink`, threading `kind` and
// `targetLine` only when they would carry information. Keeping the wiki /
// no-heading shape byte-identical to the pre-Sprint-6 record is what lets
// every existing M4.1 / T-4.1b / M4.2 / M4.4 `assert.deepEqual` continue to
// pass without modification (ADR-0024 §"Decision" — additive widening).
function composeBacklink(
  sourcePath: string,
  link: NoteLink,
  kind: "wiki" | "markdown",
  targetLine: number | null | undefined
): Backlink {
  const base = {
    sourcePath,
    line: link.line,
    snippet: link.snippet,
    heading: link.heading
  } as const;
  if (kind === "markdown" && targetLine !== undefined) {
    return { ...base, kind: "markdown", targetLine };
  }
  if (kind === "markdown") {
    return { ...base, kind: "markdown" };
  }
  if (targetLine !== undefined) {
    return { ...base, targetLine };
  }
  return base;
}

// Heading-line resolver with a per-build cache (T-4.1c). Returns the 0-based
// line of the target heading in the target note, `null` when the lookup ran
// but the heading was not found, or `undefined` when the target note's text
// was not supplied (legacy fixtures) so the backlink stays file-level and
// `targetLine` is omitted from the surfaced record entirely. Cache keys are
// `${targetPath}\u0000${heading}` so a vault with many backlinks to the same
// heading runs `findHeadingLine` exactly once for that pair.
function resolveHeadingLineCached(
  targetPath: string,
  heading: string,
  textByPath: Map<string, string>,
  cache: Map<string, number>
): number | null | undefined {
  const text = textByPath.get(targetPath);
  if (text === undefined) {
    return undefined;
  }
  const key = `${targetPath}\u0000${heading}`;
  let line = cache.get(key);
  if (line === undefined) {
    line = findHeadingLine(text, heading);
    cache.set(key, line);
  }
  return line === HEADING_LINE_MISS ? null : line;
}
