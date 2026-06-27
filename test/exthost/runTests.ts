// Extension Host test launcher (T-113b, ADR-0013).
//
// Runs in a *plain* Node process. It downloads (cached) and boots VS Code via
// `@vscode/test-electron`, pointing it at this repository as the extension
// under development and at the bundled in-host suite (`exthost-suite.cjs`) as
// the `extensionTestsPath`. A non-zero exit from the in-host `run()` surfaces
// here as a thrown error, which we translate to `process.exitCode = 1`.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
    // This launcher is bundled to `dist-test/exthost-runner.cjs`, so its
    // directory is `dist-test/` and the repo root is one level up.
    const extensionDevelopmentPath = path.resolve(__dirname, "..");
    const extensionTestsPath = path.resolve(__dirname, "exthost-suite.cjs");

    // Fresh temp workspace + user-data dir so the run is hermetic and never
    // touches the developer's real settings or repository files.
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "markstudio-ws-"));
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "markstudio-user-"));
    fs.writeFileSync(
        path.join(workspaceDir, "seed.md"),
        "# Seed\n\nSeed file for the Extension Host workspace.\n",
        "utf8"
    );

    try {
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                workspaceDir,
                "--disable-extensions",
                "--disable-workspace-trust",
                `--user-data-dir=${userDataDir}`
            ]
        });
    } catch (error) {
        console.error("[markstudio] Extension Host tests failed");
        console.error(error);
        process.exitCode = 1;
    }
}

void main();
