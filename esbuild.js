// Build script for MarkStudio.
// Bundles two independent targets with esbuild (ADR-0006):
//   1. The extension host entry (Node, CommonJS, `vscode` kept external).
//   2. The webview entry (browser, IIFE) loaded inside the custom editor.
// Also copies the @vscode/codicons font + stylesheet into `dist/codicons/`
// so the webview can load them through `asWebviewUri` for the toolbar (T-107).
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: "info"
};

/** @type {import('esbuild').BuildOptions} */
const hostConfig = {
  ...shared,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  // `vscode` is provided by the runtime, never bundle it.
  external: ["vscode"]
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  ...shared,
  entryPoints: ["src/webview/main.ts"],
  outfile: "dist/webview.js",
  platform: "browser",
  format: "iife",
  target: "es2022"
};

async function build() {
  copyCodiconAssets();

  if (watch) {
    const contexts = await Promise.all([
      esbuild.context(hostConfig),
      esbuild.context(webviewConfig)
    ]);
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("[markstudio] watching for changes...");
    return;
  }

  await Promise.all([esbuild.build(hostConfig), esbuild.build(webviewConfig)]);
  console.log("[markstudio] build complete");
}

function copyCodiconAssets() {
  const sourceDir = path.join(
    __dirname,
    "node_modules",
    "@vscode",
    "codicons",
    "dist"
  );
  const targetDir = path.join(__dirname, "dist", "codicons");
  fs.mkdirSync(targetDir, { recursive: true });
  for (const file of ["codicon.css", "codicon.ttf"]) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
