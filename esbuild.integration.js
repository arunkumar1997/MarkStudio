// Integration test build script for MarkStudio (T-113, ADR-0012).
//
// The integration layer exercises the webview seams that need a real DOM —
// CodeMirror 6 (`createEditor`) and the markdown-it preview renderer — under a
// jsdom harness on Node's built-in test runner. Like the unit build
// (`esbuild.test.js`, ADR-0011) it bundles the TypeScript tests into a single
// CommonJS file and aliases the host-only `vscode` import to the mock; unlike
// the unit build it imports `test/integration/_setup/dom.ts` **first**, so the
// jsdom globals are installed before any source module (CodeMirror in
// particular) is evaluated.
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const INTEGRATION_DIR = path.join(__dirname, "test", "integration");
const MOCK_VSCODE = path.join(__dirname, "test", "_mocks", "vscode.ts");
const DOM_SETUP = path.join(INTEGRATION_DIR, "_setup", "dom.ts");
const OUTFILE = path.join(__dirname, "dist-test", "integration.cjs");

function findTestFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findTestFiles(full));
    } else if (entry.name.endsWith(".test.ts")) {
      found.push(full);
    }
  }
  return found;
}

async function build() {
  const testFiles = findTestFiles(INTEGRATION_DIR);
  if (testFiles.length === 0) {
    console.error(
      "[markstudio] no integration test files found under test/integration/"
    );
    process.exit(1);
  }

  // Import the DOM setup first so the jsdom globals exist before any source
  // module is evaluated, then import every integration test file.
  const entryContents = [
    `import ${JSON.stringify(DOM_SETUP)};`,
    ...testFiles.map((file) => `import ${JSON.stringify(file)};`)
  ].join("\n");

  await esbuild.build({
    stdin: {
      contents: entryContents,
      resolveDir: __dirname,
      sourcefile: "integration-entry.ts",
      loader: "ts"
    },
    bundle: true,
    outfile: OUTFILE,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: "inline",
    logLevel: "info",
    // jsdom is loaded from node_modules at runtime, not bundled, so its
    // dynamic requires keep working under the CommonJS output.
    external: ["jsdom"],
    // Run the seams against the mock host API instead of the real `vscode`.
    alias: { vscode: MOCK_VSCODE }
  });

  console.log(
    `[markstudio] bundled ${testFiles.length} integration test file(s) -> ${path.relative(__dirname, OUTFILE)}`
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
