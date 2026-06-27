// Extension Host test build script for MarkStudio (T-113b, ADR-0013).
//
// The Extension Host lifecycle layer needs two bundles, built like the unit
// (`esbuild.test.js`, ADR-0011) and integration (`esbuild.integration.js`,
// ADR-0012) layers but with different externals:
//
//   1. The launcher (`runTests.ts`) runs in a plain Node process and drives
//      `@vscode/test-electron`. That package downloads/spawns VS Code and uses
//      dynamic requires, so it stays external and is loaded from node_modules.
//
//   2. The in-host suite (`index.ts` → `run()`) is `require`d *inside* the
//      Extension Host, where `vscode` is provided by the host — so `vscode`
//      stays external here (it is never aliased to the mock, unlike the unit /
//      integration builds).
const esbuild = require("esbuild");
const path = require("node:path");

const ROOT = __dirname;
const RUNNER_ENTRY = path.join(ROOT, "test", "exthost", "runTests.ts");
const SUITE_ENTRY = path.join(ROOT, "test", "exthost", "index.ts");
const RUNNER_OUT = path.join(ROOT, "dist-test", "exthost-runner.cjs");
const SUITE_OUT = path.join(ROOT, "dist-test", "exthost-suite.cjs");

const common = {
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: "inline",
    logLevel: "info"
};

async function build() {
    await esbuild.build({
        ...common,
        entryPoints: [RUNNER_ENTRY],
        outfile: RUNNER_OUT,
        // @vscode/test-electron downloads/spawns VS Code via dynamic requires;
        // keep it external so it runs from node_modules.
        external: ["@vscode/test-electron"]
    });

    await esbuild.build({
        ...common,
        entryPoints: [SUITE_ENTRY],
        outfile: SUITE_OUT,
        // `vscode` is injected by the Extension Host at runtime, never bundled.
        external: ["vscode"]
    });

    console.log(
        `[markstudio] bundled Extension Host runner + suite -> ${path.relative(ROOT, RUNNER_OUT)}, ${path.relative(ROOT, SUITE_OUT)}`
    );
}

build().catch((error) => {
    console.error(error);
    process.exit(1);
});
