// Pure reverse link-index + wiki-link target resolver for backlinks (T-4.1,
// M4.1). This is the wiki-link **resolver** deferred from Phase 3 (T-3.4 /
// ADR-0018): it maps a `[[target]]` to the workspace note(s) it points at.
//
// This module imports nothing from `vscode` or the file system — it operates on
// plain data so it is unit-testable without booting VS Code (the
// `LinkIndexService` does the I/O and feeds parsed notes in). Note identity is a
// stable POSIX-style path string (e.g. a workspace-relative path); the service
// keeps the path → URI mapping.
//
// Resolution rules (Producer decisions, plan §4):
//   * Case-insensitive **basename** matching: `[[Guide]]` matches `Guide.md`
//     anywhere in the workspace.
//   * Path-qualified targets (`[[docs/Guide]]`) resolve **relative to the
//     source note first**; if no such file exists, fall back to basename.
//   * An ambiguous basename links **all** matching notes (no error).
//   * A note never backlinks itself.

// A wiki-link extracted from a source note, with the snippet for display.
export interface NoteLink {
  // The raw wiki-link target (before `#`/`|`), trimmed.
  readonly target: string;
  // The heading anchor after `#`, or `null`. Captured but resolved to the file.
  readonly heading: string | null;
  // 0-based line index of the link in the source note.
  readonly line: number;
  // The trimmed source line containing the link (for the tree label/tooltip).
  readonly snippet: string;
}

// A parsed source note: its stable path and the links it contains.
export interface ParsedNote {
  // Stable identifier for the note (POSIX-style path string).
  readonly path: string;
  readonly links: ReadonlyArray<NoteLink>;
}

// A single backlink: a source note linking *to* the queried note.
export interface Backlink {
  // The path of the note that contains the link.
  readonly sourcePath: string;
  // 0-based line of the link in the source note.
  readonly line: number;
  // The trimmed source line containing the link.
  readonly snippet: string;
  // The heading anchor the link targeted, or `null`.
  readonly heading: string | null;
}

// The built reverse index. `backlinksFor(path)` returns every note that links
// to the note at `path`, sorted for stable display.
export interface LinkIndex {
  backlinksFor(path: string): Backlink[];
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

  for (const note of notes) {
    for (const link of note.links) {
      const targetPaths = resolveTarget(
        note.path,
        link.target,
        canonicalByLowerPath,
        pathsByBasename
      );
      for (const targetPath of targetPaths) {
        // A note never backlinks itself.
        if (targetPath.toLowerCase() === note.path.toLowerCase()) {
          continue;
        }
        const lowerTarget = targetPath.toLowerCase();
        const bucket = reverse.get(lowerTarget);
        const backlink: Backlink = {
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
      }
    }
  }

  return {
    backlinksFor(path: string): Backlink[] {
      const bucket = reverse.get(path.toLowerCase());
      return bucket ? dedupeAndSort(bucket) : [];
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
