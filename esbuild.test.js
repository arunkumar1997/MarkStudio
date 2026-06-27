// Test build script for MarkStudio (T-112, ADR-0011).
//
// Unit tests are written in TypeScript and exercise source modules directly.
// Some of those modules `import * as vscode from "vscode"`, but `vscode` is a
// host-provided module with no npm package, so the tests cannot run under a
// plain Node process as-is. This script bundles every `test/**/*.test.ts` into
// a single CommonJS file with esbuild (already a dev dependency — no new deps),
// aliasing the `vscode` import to `test/_mocks/vscode.ts`. The bundle is then
// executed by Node's built-in test runner (`node --test`).
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const TEST_DIR = path.join(__dirname, "test");
const MOCK_VSCODE = path.join(TEST_DIR, "_mocks", "vscode.ts");
const OUTFILE = path.join(__dirname, "dist-test", "tests.cjs");

// The integration layer (T-113) has its own DOM-backed build/run
// (`esbuild.integration.js`) and the Extension Host layer (T-113b) its own
// VS Code-backed build/run (`esbuild.exthost.js`); the unit build skips both to
// stay fast, DOM-free, and host-free.
const INTEGRATION_DIR = path.join(TEST_DIR, "integration");
const EXTHOST_DIR = path.join(TEST_DIR, "exthost");

function findTestFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === INTEGRATION_DIR || full === EXTHOST_DIR) {
        continue;
      }
      found.push(...findTestFiles(full));
    } else if (entry.name.endsWith(".test.ts")) {
      found.push(full);
    }
  }
  return found;
}

async function build() {
  const testFiles = findTestFiles(TEST_DIR);
  if (testFiles.length === 0) {
    console.error("[markstudio] no test files found under test/");
    process.exit(1);
  }

  // A virtual entry that imports every test file, so the whole suite bundles
  // into one runnable file.
  const entryContents = testFiles
    .map((file) => `import ${JSON.stringify(file)};`)
    .join("\n");

  await esbuild.build({
    stdin: {
      contents: entryContents,
      resolveDir: __dirname,
      sourcefile: "tests-entry.ts",
      loader: "ts"
    },
    bundle: true,
    outfile: OUTFILE,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: "inline",
    logLevel: "info",
    // Run the units against the mock host API instead of the real `vscode`.
    alias: { vscode: MOCK_VSCODE }
  });

  console.log(
    `[markstudio] bundled ${testFiles.length} test file(s) -> ${path.relative(__dirname, OUTFILE)}`
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
