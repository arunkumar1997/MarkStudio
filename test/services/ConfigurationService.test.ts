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
    assert.deepEqual(service.read(), { lineNumbers: true, wordWrap: true });
  });

  it("honours an explicit lineNumbers override", () => {
    __setConfigValues({ "editor.lineNumbers": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), { lineNumbers: false, wordWrap: true });
  });

  it("defaults wordWrap to true when unset", () => {
    const service = new ConfigurationService();
    assert.equal(service.read().wordWrap, true);
  });

  it("honours an explicit wordWrap override", () => {
    __setConfigValues({ "editor.wordWrap": false });
    const service = new ConfigurationService();
    assert.deepEqual(service.read(), { lineNumbers: true, wordWrap: false });
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
