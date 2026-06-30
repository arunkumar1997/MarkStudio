// Extension Host tests for the M4.4 Graph View (Sprint 5).
//
// These run in a real VS Code instance — they verify the surfaces a host test
// can actually observe:
//   1. The `markstudio.graph.show` command is registered (Phase C wiring).
//   2. Invoking it activates `GraphService` (exposed on the test API).
//   3. The service's `handleOpenGraphNode(path)` routes through
//      `provider.openInMarkStudio`, landing as a `TabInputCustom` for the
//      MarkStudio editor — never the built-in text editor.
//
// The webview panel itself is an isolated iframe (its drag/zoom/render is
// covered by the unit + jsdom layers); we do not assert anything about its
// inner DOM here.

import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { test } from "../harness";
import type { MarkStudioExtensionApi } from "../../../src/extension";

const VIEW_TYPE = "markstudio.editor";
const GRAPH_SHOW_COMMAND = "markstudio.graph.show";
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
  if (!api?.graphService) {
    throw new Error(
      "expected activate() to expose the GraphService on the MarkStudioExtensionApi"
    );
  }
  return api;
}

test("the graph show command is registered and exposed by the extension", async () => {
  await extensionApi();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(
    commands.includes(GRAPH_SHOW_COMMAND),
    `expected ${GRAPH_SHOW_COMMAND} to be a registered command`
  );
});

test("invoking the graph show command does not throw and the service stays alive", async () => {
  const { graphService } = await extensionApi();

  // Side-effect-only command — the panel creation succeeds without throwing
  // and the service remains usable for subsequent operations. We do not
  // assert anything about the panel itself; that surface is webview-internal.
  await vscode.commands.executeCommand(GRAPH_SHOW_COMMAND);
  await delay(200);

  // A second invocation should reveal the existing panel, not throw or leak
  // a second one (idempotency is part of the contract — Producer decision in
  // docs/sprint-5/plan.md §4).
  await vscode.commands.executeCommand(GRAPH_SHOW_COMMAND);
  await delay(100);

  assert.ok(graphService, "graphService should still be defined after show");
});

test("handleOpenGraphNode routes a known path through openInMarkStudio (TabInputCustom)", async () => {
  const targetUri = workspaceUri("graph-open-target.md");
  await writeFile(targetUri, "# Target\n\nReached from a graph-node click.\n");

  const { graphService } = await extensionApi();

  // The link index is populated asynchronously; give the watcher + scan a
  // moment so `uriFor(path)` resolves the newly-written file.
  await delay(700);

  // Drive the public method the webview's click handler funnels through.
  // The path key matches the workspace-relative POSIX identity the link
  // service uses (`pathFor(uri)` mirror).
  await graphService.handleOpenGraphNode("graph-open-target.md");
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

test("handleOpenGraphNode is a no-op for an unknown path (does not open a built-in text editor)", async () => {
  const { graphService } = await extensionApi();

  // Snapshot the active tab so we can confirm nothing was opened.
  const beforeInput = activeTabInput();

  await graphService.handleOpenGraphNode("does-not-exist-in-workspace.md");
  await delay(200);

  const afterInput = activeTabInput();
  // The active tab should be unchanged (no new MarkStudio tab, and crucially
  // no built-in text editor tab opened by accident).
  assert.equal(
    afterInput,
    beforeInput,
    "an unknown path must not open any editor"
  );
});
