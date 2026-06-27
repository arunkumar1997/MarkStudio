import * as vscode from "vscode";
import type { LayoutMode } from "../messaging/messages";

// Memento-backed persistence for cross-session host state (T-109).
//
// `vscode.setState()` only survives as long as the webview itself does;
// reloading the extension host or the window blows it away. Anything that
// should survive a reload lives here, written through the workspace
// `Memento` so values are scoped to the user's current workspace
// (CODING_GUIDELINES.md §7).
//
// Today this only stores the per-file layout mode — small, plain-JSON
// values. Document content NEVER lands here (ADR-0001).
const LAYOUT_MODE_KEY_PREFIX = "markstudio.layoutMode:";

const LAYOUT_MODES: ReadonlySet<string> = new Set([
    "split",
    "editor-only",
    "preview-only"
]);

export class StateStore {
    public constructor(private readonly memento: vscode.Memento) { }

    public getLayoutMode(uri: vscode.Uri): LayoutMode | undefined {
        const raw = this.memento.get<unknown>(layoutModeKey(uri));
        return isLayoutMode(raw) ? raw : undefined;
    }

    public async setLayoutMode(uri: vscode.Uri, mode: LayoutMode): Promise<void> {
        await this.memento.update(layoutModeKey(uri), mode);
    }
}

function layoutModeKey(uri: vscode.Uri): string {
    return LAYOUT_MODE_KEY_PREFIX + uri.toString();
}

function isLayoutMode(value: unknown): value is LayoutMode {
    return typeof value === "string" && LAYOUT_MODES.has(value);
}
