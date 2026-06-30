// Extension Host in-host entry (T-113b, ADR-0013).
//
// `@vscode/test-electron` boots VS Code with this module as the
// `extensionTestsPath`. VS Code `require`s the bundled output and invokes the
// exported `run()` from *inside* the Extension Host, so the suite has the real
// `vscode` API available. Importing each suite file registers its tests with
// the harness (top-level `test(...)` side effects); `run()` then executes them.

import { runAll } from "./harness";
import "./suite/lifecycle.test";
import "./suite/navigation.test";
import "./suite/graphView.test";

export function run(): Promise<void> {
  return runAll();
}
