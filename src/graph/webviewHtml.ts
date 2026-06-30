import * as vscode from "vscode";

// Builds the one-time webview HTML for the M4.4 Graph View panel.
//
// Mirrors `src/editor/webviewHtml.ts`: a strict Content-Security-Policy with a
// per-load nonce, only the bundled `dist/graph.js` script carrying that nonce
// may run, and local assets are loaded through `asWebviewUri`. No remote
// content. The graph webview owns its own bundle (ADR-0023) so the editor
// webview's payload is not inflated for users who never open the graph.
export function buildGraphWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const nonce = createNonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "graph.js")
  );
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "codicons", "codicon.css")
  );

  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${codiconsUri}" />
  <title>MarkStudio Graph</title>
</head>
<body>
  <main id="markstudio-graph-root" aria-busy="true"></main>
  <script nonce="${nonce}" id="markstudio-graph-bootstrap" src="${scriptUri}"></script>
</body>
</html>`;
}

function createNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
