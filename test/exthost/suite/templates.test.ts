// Extension Host tests for the Templates + Daily Notes commands
// (Sprint 7 — M5.1 / M5.3, ADR-0025).
//
// These run inside a real VS Code instance, so they verify the contracts the
// unit + integration layers cannot reach: that the three commands are actually
// contributed, and that creating a note from a template / opening today's note
// lands in the **MarkStudio custom editor** (a `TabInputCustom` with our view
// type) rather than the built-in text editor — the opens-in-MarkStudio
// non-negotiable (ADR-0021 / ADR-0025 §8). The `templates.create` command is
// intentionally *not* executed here: it opens a native QuickPick that a host
// test cannot drive; its underlying service path is covered by the integration
// layer.

import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { test } from "../harness";

const VIEW_TYPE = "markstudio.editor";
const EXTENSION_ID = "markstudio.markstudio";

const CREATE_COMMAND = "markstudio.templates.create";
const OPEN_EXAMPLE_COMMAND = "markstudio.templates.openExample";
const DAILY_OPEN_TODAY_COMMAND = "markstudio.dailyNotes.openToday";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeActiveEditor(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

function activeTabInput(): unknown {
  return vscode.window.tabGroups.activeTabGroup.activeTab?.input;
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function activate(): Promise<void> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (!extension) {
    throw new Error(`expected the ${EXTENSION_ID} extension to be installed`);
  }
  await extension.activate();
}

test("the three template / daily-note commands are contributed", async () => {
  await activate();
  const commands = await vscode.commands.getCommands(true);
  for (const id of [
    CREATE_COMMAND,
    OPEN_EXAMPLE_COMMAND,
    DAILY_OPEN_TODAY_COMMAND
  ]) {
    assert.ok(commands.includes(id), `command ${id} should be registered`);
  }
});

test("Create Example Template writes the starter file and opens it in MarkStudio", async () => {
  await activate();
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, "expected a workspace folder to be open");
  const templateUri = vscode.Uri.joinPath(
    folder.uri,
    ".markstudio",
    "templates",
    "daily.md"
  );

  await vscode.commands.executeCommand(OPEN_EXAMPLE_COMMAND);
  await delay(600);

  assert.ok(
    await fileExists(templateUri),
    "the example template should be written to .markstudio/templates/daily.md"
  );
  const input = activeTabInput();
  assert.ok(
    input instanceof vscode.TabInputCustom,
    "the example template should open in the MarkStudio custom editor"
  );
  assert.equal(input.viewType, VIEW_TYPE);
  assert.equal(input.uri.toString(), templateUri.toString());

  await closeActiveEditor();
});

test("Open Today's Note creates today's note and opens it in MarkStudio, idempotently", async () => {
  await activate();
  // Let the example template (written by the previous test) be indexed by the
  // service's watcher before resolving the daily note.
  await delay(400);

  await vscode.commands.executeCommand(DAILY_OPEN_TODAY_COMMAND);
  await delay(600);

  const first = activeTabInput();
  assert.ok(
    first instanceof vscode.TabInputCustom,
    "today's note should open in the MarkStudio custom editor"
  );
  assert.equal(first.viewType, VIEW_TYPE);
  const firstUri = first.uri.toString();
  assert.ok(
    /\/daily\/.*\.md$/.test(first.uri.path),
    `expected a daily/<date>.md path, got ${first.uri.path}`
  );

  // Re-running must focus the same note (create-if-missing / open-if-exists),
  // never duplicate the tab or fall back to the text editor.
  await vscode.commands.executeCommand(DAILY_OPEN_TODAY_COMMAND);
  await delay(400);

  const second = activeTabInput();
  assert.ok(
    second instanceof vscode.TabInputCustom,
    "re-opening today's note should stay in the MarkStudio custom editor"
  );
  assert.equal(second.uri.toString(), firstUri);

  await closeActiveEditor();
});
