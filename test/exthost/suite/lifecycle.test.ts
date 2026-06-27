// Extension Host lifecycle tests (T-113b, ADR-0013).
//
// These run inside a real VS Code instance (booted by `@vscode/test-electron`),
// so they exercise the genuine Custom Editor lifecycle the unit layer (T-112)
// and the jsdom webview-seam layer (T-113) cannot reach: activation, resolving
// the custom editor, and the native document lifecycle (dirty / save / revert)
// that `MarkStudioEditorProvider` relies on (ADR-0001).
//
// What is *observable* from a test bounds what they assert. A custom editor's
// webview runs in an isolated iframe with no public introspection API, so these
// tests verify the host-side, document-facing contract — the surface MarkStudio
// shares with VS Code — rather than reaching into the webview DOM (that is the
// jsdom layer's job, T-113).

import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { test } from "../harness";

const VIEW_TYPE = "markstudio.editor";
const EXTENSION_ID = "markstudio.markstudio";

function workspaceUri(name: string): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("expected a workspace folder to be open");
  }
  return vscode.Uri.joinPath(folder.uri, name);
}

async function writeFile(uri: vscode.Uri, text: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeActiveEditor(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

test("the extension is discoverable and activates", async () => {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(ext, `extension ${EXTENSION_ID} should be present`);
  await ext.activate();
  assert.equal(ext.isActive, true);
});

test("resolving the custom editor opens the document without error", async () => {
  const uri = workspaceUri("resolve.md");
  const text = "# Title\n\nBody paragraph.\n";
  await writeFile(uri, text);

  // `vscode.openWith` forces our custom editor (priority is "option"), which
  // drives `resolveCustomTextEditor`: it builds the webview once and starts the
  // init/ready handshake. Resolving without throwing is the observable contract.
  await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  await delay(500);

  const doc = await vscode.workspace.openTextDocument(uri);
  assert.equal(doc.getText(), text);
  assert.equal(doc.isDirty, false);

  await closeActiveEditor();
});

test("an edit makes the document dirty and save clears it", async () => {
  const uri = workspaceUri("edit.md");
  await writeFile(uri, "alpha\n");

  await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  await delay(300);

  const doc = await vscode.workspace.openTextDocument(uri);

  // The same path the webview's `edit` message takes on the host: a
  // `WorkspaceEdit` against the managed `TextDocument` (ADR-0001).
  const edit = new vscode.WorkspaceEdit();
  edit.insert(uri, new vscode.Position(0, 0), "X");
  const applied = await vscode.workspace.applyEdit(edit);

  assert.equal(applied, true);
  assert.equal(doc.getText(), "Xalpha\n");
  assert.equal(doc.isDirty, true);

  await doc.save();
  assert.equal(doc.isDirty, false);

  await closeActiveEditor();
});

test("revert restores the on-disk content and clears dirty state", async () => {
  const uri = workspaceUri("revert.md");
  const original = "original line\n";
  await writeFile(uri, original);

  await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  await delay(300);

  const doc = await vscode.workspace.openTextDocument(uri);

  const edit = new vscode.WorkspaceEdit();
  edit.insert(uri, new vscode.Position(0, 0), "changed-");
  await vscode.workspace.applyEdit(edit);
  assert.equal(doc.isDirty, true);

  // Revert reconciles the document (and therefore the webview) back to disk.
  await vscode.commands.executeCommand("workbench.action.files.revert");
  await delay(300);

  assert.equal(doc.getText(), original);
  assert.equal(doc.isDirty, false);

  await closeActiveEditor();
});
