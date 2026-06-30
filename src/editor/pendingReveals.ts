// Pending-reveal registry for the click-navigation / backlinks handshake
// (ADR-0021). Navigating to a `.md` target now opens it in the MarkStudio
// custom editor — a webview — rather than the built-in text editor, so the
// target line cannot be revealed through `showTextDocument`'s `selection`.
// Instead the line is delivered as a `revealLine` message once the target
// webview reports `ready`.
//
// When the target editor is not yet open, `vscode.openWith` drives
// `resolveCustomTextEditor` and the requested reveal must wait for that new
// webview's `ready`. This registry records the requested 0-based line keyed by
// `uri.toString()` so the provider can apply it exactly once on `ready`.
//
// Pure: imports nothing from `vscode` or the DOM, so it is unit-testable
// without booting VS Code.
export class PendingReveals {
  private readonly reveals = new Map<string, number>();

  // Record a reveal for `key` (a `uri.toString()`), overwriting any prior
  // pending reveal for the same target — the most recent navigation wins.
  public set(key: string, line: number): void {
    this.reveals.set(key, line);
  }

  // Return and remove the pending reveal for `key`, or `undefined` if none is
  // recorded. Taking is one-shot: a reveal applies to a single `ready`.
  public take(key: string): number | undefined {
    const line = this.reveals.get(key);
    if (line !== undefined) {
      this.reveals.delete(key);
    }
    return line;
  }

  // Drop any pending reveal for `key` without applying it (e.g. the target
  // editor was disposed before it ever reported `ready`).
  public clear(key: string): void {
    this.reveals.delete(key);
  }
}
