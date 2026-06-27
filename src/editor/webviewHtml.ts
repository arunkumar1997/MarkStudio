import * as vscode from "vscode";

// Builds the one-time webview HTML for a MarkStudio editor instance.
//
// Security (ARCHITECTURE.md §9): a strict Content-Security-Policy with a
// per-load nonce; only the bundled script carrying that nonce may run, and
// local assets are loaded through `asWebviewUri`. No remote content.
export function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const nonce = createNonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.js")
  );
  // VS Code Codicons (font + stylesheet) for the toolbar (T-107). The .ttf is
  // referenced by codicon.css as a relative URL, so loading the stylesheet
  // through `asWebviewUri` is enough — the browser resolves the font next to
  // it and the CSP `font-src ${webview.cspSource}` rule permits the fetch.
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "codicons", "codicon.css")
  );

  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data:`,
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
  <title>MarkStudio</title>
</head>
<body>
  <main id="markstudio-root" aria-busy="true"></main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
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
