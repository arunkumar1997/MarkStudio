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
  }
};
