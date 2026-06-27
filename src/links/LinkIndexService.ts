import * as vscode from "vscode";
import { parseWikiTargets } from "./parseWikiTargets";
import {
  buildLinkIndex,
  type Backlink,
  type LinkIndex,
  type NoteLink,
  type ParsedNote
} from "./linkIndex";

// Host-side workspace link index backing the Backlinks view (T-4.1, M4.1).
//
// Owns the I/O the pure index (`linkIndex.ts`) deliberately avoids: an async,
// batched initial scan of every workspace `.md` file (`workspace.findFiles`),
// a `FileSystemWatcher` that keeps the index live as files are created/changed/
// deleted, and a debounced rebuild that coalesces edit bursts. The index is
// rebuilt from cached, per-file parsed notes, so a single file change only
// re-parses that one file (incremental) before the cheap reverse-index rebuild.
//
// Why a watcher here when ADR-0009 deliberately did *not* add one for the
// editor: the editor reconciles a single VS Code-managed `TextDocument` via
// `onDidChangeTextDocument`, which never fires for files that are not open. The
// backlinks index must see *every* `.md` file in the workspace — including ones
// no editor has open — so the workspace `FileSystemWatcher` is the correct (and
// only) native surface for that breadth. See ADR-0020.

// Glob for the files we index and watch. Markdown notes only (T-4.1 scope).
const MARKDOWN_GLOB = "**/*.md";

// Coalesce a burst of watcher / scan events into one reverse-index rebuild.
// Long enough to absorb a save storm (e.g. a multi-file find/replace), short
// enough that the panel feels live.
const REBUILD_DEBOUNCE_MS = 250;

// Cap the number of files read concurrently during the initial scan so a large
// vault does not open thousands of file handles at once or starve the host.
const SCAN_BATCH_SIZE = 24;

// A resolved backlink with the source note's URI (for opening it) instead of
// the pure index's path string.
export interface ResolvedBacklink {
  readonly sourceUri: vscode.Uri;
  readonly line: number;
  readonly snippet: string;
  readonly heading: string | null;
}

export class LinkIndexService implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  // Fires whenever the reverse index has been rebuilt (initial scan complete,
  // or a watched file created/changed/deleted). The Backlinks view refreshes
  // the active note's backlinks in response.
  public readonly onDidChangeIndex: vscode.Event<void> =
    this.changeEmitter.event;

  // Parsed source notes keyed by their stable path string. The single source of
  // truth the reverse index is rebuilt from.
  private readonly notes = new Map<string, ParsedNote>();

  // Path string → URI, so resolved backlinks can be opened.
  private readonly uriByPath = new Map<string, vscode.Uri>();

  private index: LinkIndex = buildLinkIndex([]);
  private watcher: vscode.FileSystemWatcher | null = null;
  private rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  // Whether the initial workspace scan has completed at least once. Lets the
  // view distinguish "still indexing" from "indexed, no backlinks".
  private ready = false;

  public get isReady(): boolean {
    return this.ready;
  }

  // Start watching and kick off the initial scan. The scan runs asynchronously
  // and is intentionally **not** awaited by callers, so activation is never
  // blocked (ROADMAP Phase 4 exit criterion). The watcher is created
  // synchronously first so events during the scan are not missed.
  public start(): void {
    if (this.disposed) {
      return;
    }
    this.watcher = vscode.workspace.createFileSystemWatcher(MARKDOWN_GLOB);
    this.watcher.onDidCreate((uri) => void this.onFileTouched(uri));
    this.watcher.onDidChange((uri) => void this.onFileTouched(uri));
    this.watcher.onDidDelete((uri) => this.onFileDeleted(uri));
    void this.scanWorkspace();
  }

  // Backlinks pointing at `uri`, resolved to openable source URIs. Returns an
  // empty list when the file has no backlinks or the scan has not run.
  public backlinksFor(uri: vscode.Uri): ResolvedBacklink[] {
    const resolved: ResolvedBacklink[] = [];
    for (const backlink of this.index.backlinksFor(this.pathOf(uri))) {
      const sourceUri = this.uriByPath.get(backlink.sourcePath);
      if (sourceUri) {
        resolved.push({
          sourceUri,
          line: backlink.line,
          snippet: backlink.snippet,
          heading: backlink.heading
        });
      }
    }
    return resolved;
  }

  // Resolve a wiki-link `target` (as written in the note at `fromUri`) to the
  // workspace note(s) it points at, as openable URIs (T-4.1b). Reuses the same
  // resolver the backlinks panel builds on (case-insensitive basename;
  // path-qualified targets resolve relative-first). An ambiguous basename
  // returns all matches in index order; the caller opens the first. Returns an
  // empty array when nothing matches or the scan has not run. Never re-scans —
  // resolution is an in-memory lookup.
  public resolveTarget(fromUri: vscode.Uri, target: string): vscode.Uri[] {
    const uris: vscode.Uri[] = [];
    for (const path of this.index.resolveForward(
      this.pathOf(fromUri),
      target
    )) {
      const uri = this.uriByPath.get(path);
      if (uri) {
        uris.push(uri);
      }
    }
    return uris;
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rebuildTimer !== undefined) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = undefined;
    }
    this.watcher?.dispose();
    this.changeEmitter.dispose();
  }

  // Read + parse every workspace `.md` file in bounded-concurrency batches, then
  // build the index once and fire. Default excludes (`files.exclude` /
  // `search.exclude`) apply because `exclude` is left `undefined`.
  private async scanWorkspace(): Promise<void> {
    let uris: vscode.Uri[];
    try {
      uris = await vscode.workspace.findFiles(MARKDOWN_GLOB);
    } catch {
      // No workspace open (or the search was cancelled): nothing to index.
      this.ready = true;
      this.rebuildIndexAndFire();
      return;
    }

    for (let i = 0; i < uris.length; i += SCAN_BATCH_SIZE) {
      if (this.disposed) {
        return;
      }
      const batch = uris.slice(i, i + SCAN_BATCH_SIZE);
      await Promise.all(batch.map((uri) => this.indexFile(uri)));
    }

    if (this.disposed) {
      return;
    }
    this.ready = true;
    this.rebuildIndexAndFire();
  }

  // Read, parse, and cache a single file's links. Failures (e.g. a file deleted
  // mid-scan) leave the note absent rather than aborting the scan.
  private async indexFile(uri: vscode.Uri): Promise<void> {
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      text = Buffer.from(bytes).toString("utf8");
    } catch {
      return;
    }
    const path = this.pathOf(uri);
    this.uriByPath.set(path, uri);
    this.notes.set(path, { path, links: extractLinks(text) });
  }

  private async onFileTouched(uri: vscode.Uri): Promise<void> {
    if (this.disposed) {
      return;
    }
    await this.indexFile(uri);
    this.scheduleRebuild();
  }

  private onFileDeleted(uri: vscode.Uri): void {
    if (this.disposed) {
      return;
    }
    const path = this.pathOf(uri);
    this.notes.delete(path);
    this.uriByPath.delete(path);
    this.scheduleRebuild();
  }

  // Coalesce rebuilds: a burst of watcher events triggers a single index
  // rebuild after the debounce window.
  private scheduleRebuild(): void {
    if (this.rebuildTimer !== undefined) {
      return;
    }
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = undefined;
      this.rebuildIndexAndFire();
    }, REBUILD_DEBOUNCE_MS);
  }

  private rebuildIndexAndFire(): void {
    this.index = buildLinkIndex([...this.notes.values()]);
    if (!this.disposed) {
      this.changeEmitter.fire();
    }
  }

  // Stable POSIX-style path string for a URI: workspace-relative when the file
  // is inside a workspace folder (so relative resolution between notes works),
  // else the absolute fs path. Backslashes are normalised to `/` so the pure
  // index is platform-independent.
  private pathOf(uri: vscode.Uri): string {
    const relative = vscode.workspace.asRelativePath(uri, false);
    return relative.replace(/\\/g, "/");
  }
}

// Map the pure target list onto `NoteLink`s, attaching the trimmed source line
// as the snippet. Kept here (not in the pure parser) so `parseWikiTargets`
// stays a minimal target extractor.
function extractLinks(text: string): NoteLink[] {
  const targets = parseWikiTargets(text);
  if (targets.length === 0) {
    return [];
  }
  const lines = text.split(/\r\n|\r|\n/);
  return targets.map<NoteLink>((target) => ({
    target: target.target,
    heading: target.heading,
    line: target.line,
    snippet: (lines[target.line] ?? "").trim()
  }));
}

export type { Backlink };
