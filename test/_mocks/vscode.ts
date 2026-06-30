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
  }
};

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
