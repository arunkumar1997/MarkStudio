// Integration tests for the TemplateService host seam (Sprint 7 — M5.1/M5.3).
//
// The service owns the I/O the pure template modules avoid: an async scan of
// both template roots, FileSystemWatcher-backed debounced rebuilds, and the
// create-if-missing / never-overwrite write that routes every open through
// `provider.openInMarkStudio`. The test bundler aliases `vscode` to
// `test/_mocks/vscode.ts`, whose in-memory filesystem + synthetic watcher
// surface let these flows run host-free.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { TemplateService } from "../../src/templates/TemplateService";
import type { MarkStudioEditorProvider } from "../../src/editor/MarkStudioEditorProvider";
import {
  Uri,
  __reset,
  __setFile,
  __readFile,
  __setWorkspaceFolders,
  __fireWatcher,
  __getStatusBarMessages
} from "../_mocks/vscode";

const WS = "/ws";
const TEMPLATES_DIR = "/ws/.markstudio/templates";
const USER_DIR = "/global/templates";

// A fake provider recording every open so tests can assert the
// opens-in-MarkStudio contract without a real custom editor.
function createFakeProvider(): {
  provider: MarkStudioEditorProvider;
  opened: Array<{ path: string; line: number }>;
} {
  const opened: Array<{ path: string; line: number }> = [];
  const provider = {
    openInMarkStudio(uri: Uri, line: number): Promise<void> {
      opened.push({ path: uri.path, line });
      return Promise.resolve();
    }
  } as unknown as MarkStudioEditorProvider;
  return { provider, opened };
}

function createService(provider: MarkStudioEditorProvider): TemplateService {
  const context = {
    globalStorageUri: Uri.file("/global")
  } as unknown as import("vscode").ExtensionContext;
  return new TemplateService(context, provider);
}

// Resolve on the next `onDidChangeTemplates` fire (initial scan or rebuild).
function nextChange(service: TemplateService): Promise<void> {
  return new Promise((resolve) => {
    const sub = service.onDidChangeTemplates(() => {
      sub.dispose();
      resolve();
    });
  });
}

const FILE_TEMPLATE = [
  "---",
  "kind: file",
  "description: Daily journal",
  "output: notes/{{filename}}.md",
  "---",
  "# {{title}}",
  ""
].join("\n");

describe("TemplateService — scan, watch, create", () => {
  let service: TemplateService;

  beforeEach(() => {
    __reset();
    __setWorkspaceFolders([WS]);
  });

  afterEach(() => {
    service.dispose();
  });

  it("scans the workspace templates folder on start", async () => {
    __setFile(`${TEMPLATES_DIR}/daily.md`, FILE_TEMPLATE);
    const { provider } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;

    const templates = service.getTemplates("file");
    assert.equal(templates.length, 1);
    assert.equal(templates[0].basename, "daily");
    assert.equal(templates[0].description, "Daily journal");
    assert.equal(templates[0].source, "workspace");
  });

  it("rebuilds when a watcher reports a new template", async () => {
    __setFile(`${TEMPLATES_DIR}/daily.md`, FILE_TEMPLATE);
    const { provider } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;
    assert.equal(service.getTemplates().length, 1);

    const rebuilt = nextChange(service);
    __setFile(`${TEMPLATES_DIR}/meeting.md`, FILE_TEMPLATE);
    __fireWatcher("create", `${TEMPLATES_DIR}/meeting.md`);
    await rebuilt;

    assert.equal(service.getTemplates().length, 2);
  });

  it("prefers the workspace template when a user template shares its name", async () => {
    __setFile(`${TEMPLATES_DIR}/daily.md`, FILE_TEMPLATE);
    __setFile(
      `${USER_DIR}/daily.md`,
      FILE_TEMPLATE.replace("Daily journal", "User daily")
    );
    const { provider } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;

    const templates = service.getTemplates();
    assert.equal(templates.length, 1, "same basename collapses to one");
    const daily = service.getTemplate("daily");
    assert.equal(daily?.source, "workspace");
    assert.equal(daily?.description, "Daily journal");
  });

  it("expands variables and creates the note, opening it in MarkStudio", async () => {
    __setFile(`${TEMPLATES_DIR}/daily.md`, FILE_TEMPLATE);
    const { provider, opened } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;

    const template = service.getTemplate("daily");
    assert.ok(template);
    await service.createFromTemplate(template, "My Note");

    assert.equal(__readFile("/ws/notes/My Note.md"), "# My Note\n");
    assert.equal(opened.length, 1);
    assert.equal(opened[0].path, "/ws/notes/My Note.md");
  });

  it("never overwrites an existing target — opens it with a status notice", async () => {
    __setFile(`${TEMPLATES_DIR}/daily.md`, FILE_TEMPLATE);
    __setFile("/ws/notes/My Note.md", "SENTINEL — keep me\n");
    const { provider, opened } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;

    const template = service.getTemplate("daily");
    assert.ok(template);
    await service.createFromTemplate(template, "My Note");

    assert.equal(
      __readFile("/ws/notes/My Note.md"),
      "SENTINEL — keep me\n",
      "existing content is preserved"
    );
    assert.ok(
      __getStatusBarMessages().some((m) => m.includes("target exists")),
      "a status notice is shown"
    );
    assert.equal(opened.length, 1, "the existing file is still opened");
  });

  it("creates the example template once, then opens it idempotently", async () => {
    const { provider, opened } = createFakeProvider();
    service = createService(provider);

    const ready = nextChange(service);
    service.start();
    await ready;

    await service.createExampleTemplate();
    const firstContent = __readFile(`${TEMPLATES_DIR}/daily.md`);
    assert.ok(firstContent, "example template is written");

    await service.createExampleTemplate();
    assert.equal(
      __readFile(`${TEMPLATES_DIR}/daily.md`),
      firstContent,
      "second run does not rewrite the file"
    );
    assert.equal(opened.length, 2, "both runs open the template");
  });
});
