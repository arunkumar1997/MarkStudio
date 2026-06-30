// Runtime mock for the `vscode` module (T-112).
//
// The real `vscode` module is provided by the Extension Host and is not an npm
// package, so any source file that does `import * as vscode from "vscode"`
// cannot run under a plain Node unit test. The test bundler (`esbuild.test.js`)
// aliases the `vscode` import to this file, giving the small, deterministic
// subset of the API that the units under test actually touch.
//
// Tests import this module directly (via `../_mocks/vscode`) to drive and
// inspect the mock; because the alias points at this same file, the source and
// the test share one module instance, so the recorded state lines up.

// ─── Minimal value types ────────────────────────────────────────────────────

export class Position {
  public constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class Range {
  public constructor(
    public readonly start: Position,
    public readonly end: Position
  ) {}
}

export interface RecordedReplace {
  readonly uri: unknown;
  readonly range: Range;
  readonly insert: string;
}

export class WorkspaceEdit {
  public readonly replacements: RecordedReplace[] = [];

  public replace(uri: unknown, range: Range, insert: string): void {
    this.replacements.push({ uri, range, insert });
  }
}

class Disposable {
  public constructor(private readonly onDispose: () => void) {}
  public dispose(): void {
    this.onDispose();
  }
}

// ─── Mutable mock state + control surface ───────────────────────────────────

let applyEditResult = true;
let lastAppliedEdit: WorkspaceEdit | null = null;
let configValues: Record<string, unknown> = {};
let changeListeners: Array<(event: ConfigChangeEvent) => void> = [];

// In-memory filesystem backing `workspace.fs` (Sprint 7 — TemplateService).
interface FsEntry {
  readonly type: FileType;
  content?: Uint8Array;
}
let fsEntries = new Map<string, FsEntry>();
let mockWorkspaceFolders: WorkspaceFolder[] | undefined;
let mockWorkspaceName: string | undefined;
let mockClipboardText = "";
let statusBarMessages: string[] = [];
let errorMessages: string[] = [];
let createdWatchers: MockFileSystemWatcher[] = [];

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function ensureDir(path: string): void {
  let current = normalizePath(path);
  while (current !== "/" && !fsEntries.has(current)) {
    fsEntries.set(current, { type: FileType.Directory });
    const slash = current.lastIndexOf("/");
    current = slash <= 0 ? "/" : current.slice(0, slash);
  }
}

interface ConfigChangeEvent {
  affectsConfiguration(section: string): boolean;
}

// Control what `workspace.applyEdit` resolves to.
export function __setApplyEditResult(value: boolean): void {
  applyEditResult = value;
}

// The last `WorkspaceEdit` handed to `workspace.applyEdit` (null if none).
export function __getLastAppliedEdit(): WorkspaceEdit | null {
  return lastAppliedEdit;
}

// Seed the values `workspace.getConfiguration(...).get(key, default)` returns.
// Keys are dotted paths relative to the section, e.g. "editor.lineNumbers".
export function __setConfigValues(values: Record<string, unknown>): void {
  configValues = values;
}

// Fire an `onDidChangeConfiguration` event. `affected` is the list of section
// prefixes that changed (e.g. ["markstudio"] or ["editor"]).
export function __fireConfigChange(affected: ReadonlyArray<string>): void {
  const event: ConfigChangeEvent = {
    affectsConfiguration: (section) =>
      affected.some((a) => a === section || a.startsWith(`${section}.`))
  };
  for (const listener of [...changeListeners]) {
    listener(event);
  }
}

// Reset all mock state between tests.
export function __reset(): void {
  applyEditResult = true;
  lastAppliedEdit = null;
  configValues = {};
  changeListeners = [];
  fsEntries = new Map();
  mockWorkspaceFolders = undefined;
  mockWorkspaceName = undefined;
  mockClipboardText = "";
  statusBarMessages = [];
  errorMessages = [];
  createdWatchers = [];
}

// ─── Filesystem + workspace control surface (Sprint 7) ──────────────────────

// Seed a file (and its ancestor directories) into the in-memory filesystem.
export function __setFile(path: string, content: string): void {
  const normalized = normalizePath(path);
  const slash = normalized.lastIndexOf("/");
  if (slash > 0) {
    ensureDir(normalized.slice(0, slash));
  }
  fsEntries.set(normalized, {
    type: FileType.File,
    content: Buffer.from(content, "utf8")
  });
}

// Read a file's UTF-8 content back, or `undefined` if it does not exist.
export function __readFile(path: string): string | undefined {
  const entry = fsEntries.get(normalizePath(path));
  return entry?.content !== undefined
    ? Buffer.from(entry.content).toString("utf8")
    : undefined;
}

// Set the workspace folders `workspace.workspaceFolders` returns.
export function __setWorkspaceFolders(paths: ReadonlyArray<string>): void {
  mockWorkspaceFolders = paths.map((p, index) => ({
    uri: new Uri(normalizePath(p)),
    name: p.slice(p.lastIndexOf("/") + 1),
    index
  }));
}

export function __setWorkspaceName(name: string | undefined): void {
  mockWorkspaceName = name;
}

export function __setClipboard(text: string): void {
  mockClipboardText = text;
}

export function __getStatusBarMessages(): string[] {
  return [...statusBarMessages];
}

export function __getErrorMessages(): string[] {
  return [...errorMessages];
}

// Fire a watcher event so subscribers (e.g. TemplateService) react. The mock
// fires on every created watcher, mirroring how the real host would deliver a
// matching event to a watcher whose glob covers the URI.
export function __fireWatcher(
  kind: "create" | "change" | "delete",
  path: string
): void {
  const uri = new Uri(normalizePath(path));
  for (const watcher of createdWatchers) {
    watcher.__fire(kind, uri);
  }
}

// ─── The `vscode.workspace` subset under test ───────────────────────────────

export const workspace = {
  applyEdit(edit: WorkspaceEdit): Promise<boolean> {
    lastAppliedEdit = edit;
    return Promise.resolve(applyEditResult);
  },

  getConfiguration(_section: string, _resource?: unknown) {
    return {
      get<T>(key: string, defaultValue: T): T {
        return (
          Object.prototype.hasOwnProperty.call(configValues, key)
            ? configValues[key]
            : defaultValue
        ) as T;
      }
    };
  },

  onDidChangeConfiguration(
    listener: (event: ConfigChangeEvent) => void
  ): Disposable {
    changeListeners.push(listener);
    return new Disposable(() => {
      changeListeners = changeListeners.filter((l) => l !== listener);
    });
  },

  // Display-only utility — strips a leading workspace root marker so a unit
  // test can assert tree-item tooltips against a stable, host-independent
  // string. The real implementation is far more sophisticated; this is the
  // minimum surface needed by `BacklinksTreeProvider`'s tooltip.
  asRelativePath(uriOrPath: Uri | string): string {
    const raw = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.path;
    return raw.replace(/^\/vault\//, "");
  },

  get workspaceFolders(): WorkspaceFolder[] | undefined {
    return mockWorkspaceFolders;
  },

  get name(): string | undefined {
    return mockWorkspaceName;
  },

  createFileSystemWatcher(_pattern: unknown): MockFileSystemWatcher {
    const watcher = new MockFileSystemWatcher();
    createdWatchers.push(watcher);
    return watcher;
  },

  fs: {
    readFile(uri: Uri): Promise<Uint8Array> {
      const entry = fsEntries.get(normalizePath(uri.path));
      if (entry === undefined || entry.type !== FileType.File) {
        return Promise.reject(new Error(`ENOENT: ${uri.path}`));
      }
      return Promise.resolve(entry.content ?? new Uint8Array());
    },
    writeFile(uri: Uri, content: Uint8Array): Promise<void> {
      const normalized = normalizePath(uri.path);
      const slash = normalized.lastIndexOf("/");
      if (slash > 0) {
        ensureDir(normalized.slice(0, slash));
      }
      fsEntries.set(normalized, { type: FileType.File, content });
      return Promise.resolve();
    },
    stat(uri: Uri): Promise<{ type: FileType }> {
      const entry = fsEntries.get(normalizePath(uri.path));
      if (entry === undefined) {
        return Promise.reject(new Error(`ENOENT: ${uri.path}`));
      }
      return Promise.resolve({ type: entry.type });
    },
    readDirectory(uri: Uri): Promise<[string, FileType][]> {
      const dir = normalizePath(uri.path);
      if (dir !== "/" && fsEntries.get(dir)?.type !== FileType.Directory) {
        return Promise.reject(new Error(`ENOENT: ${uri.path}`));
      }
      const prefix = dir === "/" ? "/" : `${dir}/`;
      const children: [string, FileType][] = [];
      for (const [path, entry] of fsEntries) {
        if (path === dir || !path.startsWith(prefix)) {
          continue;
        }
        const rest = path.slice(prefix.length);
        if (rest.includes("/")) {
          continue; // not an immediate child
        }
        children.push([rest, entry.type]);
      }
      return Promise.resolve(children);
    }
  }
};

// ─── Environment + window surface (Sprint 7) ────────────────────────────────

export const env = {
  clipboard: {
    readText(): Promise<string> {
      return Promise.resolve(mockClipboardText);
    }
  }
};

export const window = {
  setStatusBarMessage(message: string, _hideAfterMs?: number): Disposable {
    statusBarMessages.push(message);
    return new Disposable(() => {});
  },
  showErrorMessage(message: string): Promise<undefined> {
    errorMessages.push(message);
    return Promise.resolve(undefined);
  }
};

// ─── Filesystem + glob value types (Sprint 7) ───────────────────────────────

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64
}

export class RelativePattern {
  public constructor(
    public readonly base: unknown,
    public readonly pattern: string
  ) {}
}

export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

class MockFileSystemWatcher {
  private readonly createEmitter = new EventEmitter<Uri>();
  private readonly changeEmitter = new EventEmitter<Uri>();
  private readonly deleteEmitter = new EventEmitter<Uri>();
  public readonly onDidCreate = this.createEmitter.event;
  public readonly onDidChange = this.changeEmitter.event;
  public readonly onDidDelete = this.deleteEmitter.event;

  public __fire(kind: "create" | "change" | "delete", uri: Uri): void {
    if (kind === "create") {
      this.createEmitter.fire(uri);
    } else if (kind === "change") {
      this.changeEmitter.fire(uri);
    } else {
      this.deleteEmitter.fire(uri);
    }
  }

  public dispose(): void {
    this.createEmitter.dispose();
    this.changeEmitter.dispose();
    this.deleteEmitter.dispose();
  }
}

// ─── Tree / theme surface (Phase D of Sprint 6 — for BacklinksTreeProvider) ─

// VS Code's `Uri` is a complex class. The mock pins the narrow contract the
// Backlinks panel relies on: a stable `path` string and a `toString()` that's
// unique per instance. `file()` is the only factory the units under test use.
export class Uri {
  public readonly scheme = "file";
  public constructor(public readonly path: string) {}
  public static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }
  public static parse(value: string): Uri {
    return new Uri(value.replace(/^file:\/\//, ""));
  }
  public static joinPath(base: Uri, ...segments: string[]): Uri {
    const trimmed = base.path.replace(/\/+$/, "");
    const tail = segments.filter((s) => s.length > 0).join("/");
    return new Uri(tail.length > 0 ? `${trimmed}/${tail}` : trimmed);
  }
  public toString(): string {
    return `file://${this.path}`;
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export class TreeItem {
  public description?: string;
  public tooltip?: string | MarkdownString;
  public resourceUri?: Uri;
  public iconPath?: ThemeIcon;
  public command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };
  public constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {}
}

export class ThemeIcon {
  public constructor(public readonly id: string) {}
}

export class MarkdownString {
  public constructor(public readonly value: string) {}
}

// A minimal `EventEmitter` matching VS Code's contract closely enough for unit
// tests: an `event` registration function returning a `Disposable`, a `fire`
// method, and a `dispose` that drops all listeners.
export class EventEmitter<T> {
  private listeners: Array<(value: T) => void> = [];
  public readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    });
  };
  public fire(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }
  public dispose(): void {
    this.listeners = [];
  }
}
