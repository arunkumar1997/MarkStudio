// Extension Host navigation tests (ADR-0021).
//
// These verify the click-navigation / backlinks fix: navigating to a `.md`
// target opens it in the **MarkStudio custom editor** (a webview) rather than
// the built-in text editor. The in-preview wiki-link click is webview-
// originated and not directly drivable from a host test (the webview is an
// isolated iframe), but the Backlinks panel's open command and the
// click-navigation both funnel through the provider's `openInMarkStudio`, which
// routes through `vscode.openWith` with our view type. Running the public
// `markstudio.backlinks.open` command exercises that shared host path in a real
// VS Code instance.
//
// What is observable bounds what we assert: the resolved tab's input. A custom
// editor surfaces as `vscode.TabInputCustom` with `viewType === VIEW_TYPE`,
// whereas the built-in editor surfaces as `vscode.TabInputText`. The line
// reveal travels into the webview iframe and is out of a host test's reach
// (that seam is covered by the jsdom + unit layers).

import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { test } from "../harness";
import type { MarkStudioExtensionApi } from "../../../src/extension";

const VIEW_TYPE = "markstudio.editor";
const BACKLINKS_OPEN_COMMAND = "markstudio.backlinks.open";
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

function activeTabInput(): unknown {
  return vscode.window.tabGroups.activeTabGroup.activeTab?.input;
}

async function extensionApi(): Promise<MarkStudioExtensionApi> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (!extension) {
    throw new Error(`expected the ${EXTENSION_ID} extension to be installed`);
  }
  const api = (await extension.activate()) as
    | MarkStudioExtensionApi
    | undefined;
  if (!api?.provider) {
    throw new Error("expected activate() to return the MarkStudioExtensionApi");
  }
  return api;
}

test("the backlinks open command opens the source in the MarkStudio editor", async () => {
  const uri = workspaceUri("backlink-source.md");
  await writeFile(uri, "# Source\n\nLinks to [[other]] on this line.\n");

  // The exact path a backlink click takes: the internal open command with the
  // source URI + linking line. It must land in MarkStudio, not the text editor.
  await vscode.commands.executeCommand(BACKLINKS_OPEN_COMMAND, uri, 2);
  await delay(500);

  const input = activeTabInput();
  assert.ok(
    input instanceof vscode.TabInputCustom,
    "active tab should be a custom editor, not the built-in text editor"
  );
  assert.equal(input.viewType, VIEW_TYPE);
  assert.equal(input.uri.toString(), uri.toString());

  await closeActiveEditor();
});

test("the host markdown-link handler resolves a relative `.md` href and opens it in MarkStudio", async () => {
  const sourceUri = workspaceUri("md-link-source.md");
  const targetUri = workspaceUri("md-link-target.md");
  await writeFile(targetUri, "# Target\n\n## Section\n\nBody.\n");
  await writeFile(
    sourceUri,
    "# Source\n\nLinks to [target](./md-link-target.md).\n"
  );

  const { provider } = await extensionApi();

  // The exact path a preview click takes through the host: the webview posts
  // `openMarkdownLink { href, target, heading }` → bus dispatches to
  // `provider.openMarkdownLink(fromUri, ...)`. Driving it directly here
  // proves the host handler resolves the relative href against the source
  // note and routes the target through `openInMarkStudio` (ADR-0021's
  // pending-reveal handshake), landing as a `TabInputCustom`.
  await provider.openMarkdownLink(
    sourceUri,
    "./md-link-target.md",
    "./md-link-target.md",
    null
  );
  await delay(500);

  const input = activeTabInput();
  assert.ok(
    input instanceof vscode.TabInputCustom,
    "active tab should be the MarkStudio custom editor, not the built-in text editor"
  );
  assert.equal(input.viewType, VIEW_TYPE);
  assert.equal(input.uri.toString(), targetUri.toString());

  await closeActiveEditor();
});

test("the host markdown-link handler resolves a workspace-absolute `/path` href and opens it in MarkStudio", async () => {
  const sourceUri = workspaceUri("md-link-abs-source.md");
  const targetUri = workspaceUri("md-link-abs-target.md");
  await writeFile(targetUri, "# Target\n\nBody.\n");
  await writeFile(
    sourceUri,
    "# Source\n\nLinks to [target](/md-link-abs-target.md).\n"
  );

  const { provider } = await extensionApi();

  // Workspace-absolute paths resolve against the source's workspace folder.
  await provider.openMarkdownLink(
    sourceUri,
    "/md-link-abs-target.md",
    "/md-link-abs-target.md",
    null
  );
  await delay(500);

  const input = activeTabInput();
  assert.ok(
    input instanceof vscode.TabInputCustom,
    "active tab should be the MarkStudio custom editor"
  );
  assert.equal(input.viewType, VIEW_TYPE);
  assert.equal(input.uri.toString(), targetUri.toString());

  await closeActiveEditor();
});

test("the host markdown-link handler is a no-op for an external `https:` href", async () => {
  const sourceUri = workspaceUri("md-link-external-source.md");
  await writeFile(sourceUri, "# Source\n\nBody.\n");

  // Open the source so we can prove the active tab is left untouched (the
  // handler must never navigate for an external scheme).
  await vscode.commands.executeCommand("vscode.openWith", sourceUri, VIEW_TYPE);
  await delay(400);
  const before = activeTabInput();
  assert.ok(before instanceof vscode.TabInputCustom);
  assert.equal(before.uri.toString(), sourceUri.toString());

  const { provider } = await extensionApi();

  await provider.openMarkdownLink(
    sourceUri,
    "https://example.com/a.md",
    "https://example.com/a.md",
    null
  );
  await delay(200);

  const after = activeTabInput();
  assert.ok(
    after instanceof vscode.TabInputCustom,
    "external hrefs must not navigate or change the active tab"
  );
  assert.equal(after.uri.toString(), sourceUri.toString());

  await closeActiveEditor();
});

test("opening an already-open target focuses the MarkStudio editor (no text editor)", async () => {
  const uri = workspaceUri("backlink-reopen.md");
  await writeFile(uri, "# Reopen\n\nBody.\n");

  // Open it in MarkStudio first, then re-issue the open command (the
  // already-open case): it must focus the existing MarkStudio editor rather
  // than fall back to the built-in text editor or duplicate the tab.
  await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  await delay(400);
  await vscode.commands.executeCommand(BACKLINKS_OPEN_COMMAND, uri, 0);
  await delay(300);

  const input = activeTabInput();
  assert.ok(
    input instanceof vscode.TabInputCustom,
    "active tab should remain the MarkStudio custom editor"
  );
  assert.equal(input.viewType, VIEW_TYPE);
  assert.equal(input.uri.toString(), uri.toString());

  await closeActiveEditor();
});
