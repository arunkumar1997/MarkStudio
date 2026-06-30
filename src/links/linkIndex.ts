// Pure reverse link-index + wiki-link target resolver for backlinks (T-4.1,
// M4.1). This is the wiki-link **resolver** deferred from Phase 3 (T-3.4 /
// ADR-0018): it maps a `[[target]]` to the workspace note(s) it points at.
//
// Sprint 6 (ADR-0024) additively widens this module to also resolve standard
// Markdown links (`[text](./note.md)`). `NoteLink` and `Backlink` gain an
// optional `kind` field (`"wiki" | "markdown"`); when absent / `"wiki"` the
// behaviour matches the pre-Sprint-6 shape *exactly* so every M4.1 / T-4.1b /
// M4.2 / M4.4 test passes unchanged.
//
// This module imports nothing from `vscode` or the file system — it operates on
// plain data so it is unit-testable without booting VS Code (the
// `LinkIndexService` does the I/O and feeds parsed notes in). Note identity is a
// stable POSIX-style path string (e.g. a workspace-relative path); the service
// keeps the path → URI mapping.
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

// A parsed source note: its stable path and the links it contains.
export interface ParsedNote {
  // Stable identifier for the note (POSIX-style path string).
  readonly path: string;
  readonly links: ReadonlyArray<NoteLink>;
}

// A single backlink: a source note linking *to* the queried note. `kind` is
// emitted on the returned object only for Markdown-link backlinks, so the
// pre-Sprint-6 shape (`{ sourcePath, line, snippet, heading }`) is preserved
// byte-for-byte for wiki-only inputs and every M4.1 / T-4.1b / M4.2 / M4.4
// `assert.deepEqual` continues to pass without modification.
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

// Build a reverse index over `notes`. O(total links): each link is resolved to
// its target note(s) once and bucketed under the resolved path.
export function buildLinkIndex(notes: ReadonlyArray<ParsedNote>): LinkIndex {
  // Lowercased-path → canonical path, for case-insensitive membership tests.
  const canonicalByLowerPath = new Map<string, string>();
  // Basename key → canonical paths sharing it (ambiguous basenames link all).
  const pathsByBasename = new Map<string, string[]>();

  for (const note of notes) {
    canonicalByLowerPath.set(note.path.toLowerCase(), note.path);
    const key = basenameKey(note.path);
    const bucket = pathsByBasename.get(key);
    if (bucket) {
      bucket.push(note.path);
    } else {
      pathsByBasename.set(key, [note.path]);
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
        // For Markdown links emit `kind` on the backlink. For wiki links omit
        // it entirely so the pre-Sprint-6 deep-equal shape is unchanged.
        const backlink: Backlink =
          kind === "markdown"
            ? {
                sourcePath: note.path,
                line: link.line,
                snippet: link.snippet,
                heading: link.heading,
                kind: "markdown"
              }
            : {
                sourcePath: note.path,
                line: link.line,
                snippet: link.snippet,
                heading: link.heading
              };
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
