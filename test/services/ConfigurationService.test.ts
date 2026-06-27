// Unit tests for ConfigurationService (T-112).
//
// The service is a thin, stateless reader over the VS Code Configuration API
// (T-111): `read(resource?)` resolves the live `markstudio.*` snapshot and
// `onDidChange` fires only for `markstudio.*` changes. The test bundler aliases
// `vscode` to `test/_mocks/vscode.ts`, whose control surface seeds the config
// values and fires synthetic configuration-change events.

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { ConfigurationService } from "../../src/services/ConfigurationService";
import {
  __fireConfigChange,
  __reset,
  __setConfigValues
} from "../_mocks/vscode";

describe("ConfigurationService.read", () => {
  beforeEach(() => {
    __reset();
  });

  it("defaults lineNumbers to true when unset", () => {
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: true,
      math: true,
      mermaid: true,
      callouts: true,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("honours an explicit lineNumbers override", () => {
    __setConfigValues({ "editor.lineNumbers": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: false,
      wordWrap: true,
      math: true,
      mermaid: true,
      callouts: true,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults wordWrap to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().wordWrap, true);
  });

  it("honours an explicit wordWrap override", () => {
    __setConfigValues({ "editor.wordWrap": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: false,
      math: true,
      mermaid: true,
      callouts: true,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults math to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().math, true);
  });

  it("honours an explicit math override", () => {
    __setConfigValues({ "preview.math": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: true,
      math: false,
      mermaid: true,
      callouts: true,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults mermaid to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().mermaid, true);
  });

  it("honours an explicit mermaid override", () => {
    __setConfigValues({ "preview.mermaid": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: true,
      math: true,
      mermaid: false,
      callouts: true,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults callouts to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().callouts, true);
  });

  it("honours an explicit callouts override", () => {
    __setConfigValues({ "preview.callouts": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: true,
      math: true,
      mermaid: true,
      callouts: false,
      wikiLinks: true,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults wikiLinks to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().wikiLinks, true);
  });

  it("honours an explicit wikiLinks override", () => {
    __setConfigValues({ "preview.wikiLinks": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), {
      lineNumbers: true,
      wordWrap: true,
      math: true,
      mermaid: true,
      callouts: true,
      wikiLinks: false,
      footnotes: true,
      taskLists: true,
      tables: true,
      strikethrough: true
    });
  });

  it("defaults footnotes to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().footnotes, true);
  });

  it("honours an explicit footnotes override", () => {
    __setConfigValues({ "preview.footnotes": false });
    const service = new ConfigurationService();
    assert.equal(service.read().footnotes, false);
  });

  it("defaults taskLists to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().taskLists, true);
  });

  it("honours an explicit taskLists override", () => {
    __setConfigValues({ "preview.taskLists": false });
    const service = new ConfigurationService();
    assert.equal(service.read().taskLists, false);
  });

  it("defaults tables to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().tables, true);
  });

  it("honours an explicit tables override", () => {
    __setConfigValues({ "preview.tables": false });
    const service = new ConfigurationService();
    assert.equal(service.read().tables, false);
  });

  it("defaults strikethrough to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().strikethrough, true);
  });

  it("honours an explicit strikethrough override", () => {
    __setConfigValues({ "preview.strikethrough": false });
    const service = new ConfigurationService();
    assert.equal(service.read().strikethrough, false);
  });
});

describe("ConfigurationService.onDidChange", () => {
  beforeEach(() => {
    __reset();
  });

  it("invokes the listener for a markstudio.* change", () => {
    const service = new ConfigurationService();
    let calls = 0;
    const sub = service.onDidChange(() => {
      calls += 1;
    });

    __fireConfigChange(["markstudio"]);
    assert.equal(calls, 1);

    sub.dispose();
  });

  it("ignores changes outside the markstudio section", () => {
    const service = new ConfigurationService();
    let calls = 0;
    const sub = service.onDidChange(() => {
      calls += 1;
    });

    __fireConfigChange(["editor"]);
    assert.equal(calls, 0);

    sub.dispose();
  });

  it("stops firing after dispose", () => {
    const service = new ConfigurationService();
    let calls = 0;
    const sub = service.onDidChange(() => {
      calls += 1;
    });

    sub.dispose();
    __fireConfigChange(["markstudio"]);
    assert.equal(calls, 0);
  });
});
