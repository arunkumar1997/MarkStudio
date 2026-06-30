import * as vscode from "vscode";
import type { MarkStudioEditorProvider } from "../editor/MarkStudioEditorProvider";
import { parseFrontMatter } from "./frontMatterParser";
import {
  expand,
  findCursorMarker,
  type ExpandContext
} from "./variableExpander";
import { format } from "./dateFormatter";
import {
  resolve,
  filterByKind,
  type ResolvedTemplate,
  type ScannedTemplate
} from "./templateResolver";
import type { TemplateKind } from "./frontMatterParser";

// Host-side template engine backing the M5.1 commands (ADR-0025).
//
// Owns the I/O the pure modules (`frontMatterParser`, `variableExpander`,
// `dateFormatter`, `templateResolver`) deliberately avoid: an async scan of
// both template roots, two `FileSystemWatcher`s that keep the resolved list
// live, and the debounced rebuild that coalesces edit bursts. Mirrors the
// shape of `LinkIndexService` (ADR-0020): constructor + `start()` + private
// `scheduleRebuild()` + an `onDidChange*` event.
//
// Every file the engine opens routes through `provider.openInMarkStudio` so a
// freshly-created note lands in the MarkStudio custom editor — never the
// built-in text editor (PR #4 / ADR-0021 lesson, ADR-0025 §8).

const SECTION = "markstudio";

// Coalesce a burst of watcher events (e.g. saving several templates) into one
// rescan. The same window the link index uses.
const REBUILD_DEBOUNCE_MS = 250;

// Setting keys + their defaults, kept in one place to avoid magic strings.
const DEFAULTS = {
  workspaceFolder: ".markstudio/templates",
  userFolder: "",
  dailyTemplate: "daily",
  dailyFolder: "daily",
  dateFormat: "YYYY-MM-DD"
} as const;

// The starter template `MarkStudio: Create Example Template` writes into the
// workspace templates folder (create-if-missing). It doubles as the default
// `daily` template, so "Open Today's Note" works immediately after.
const EXAMPLE_TEMPLATE_BASENAME = "daily";
const EXAMPLE_TEMPLATE_CONTENT = `---
kind: file
description: Daily journal entry
output: daily/{{date}}.md
cursor: 6
---
# {{date}}

## Tasks

## Notes
`;

const STATUS_EXISTS = "MarkStudio: Template target exists — opening.";

export class TemplateService implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  // Fires whenever the resolved template list has been rebuilt (initial scan
  // complete, or a watched template created/changed/deleted).
  public readonly onDidChangeTemplates: vscode.Event<void> =
    this.changeEmitter.event;

  private resolved: ResolvedTemplate[] = [];
  private readonly watchers: vscode.FileSystemWatcher[] = [];
  private rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  private ready = false;
  private disposed = false;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly provider: MarkStudioEditorProvider
  ) {}

  // Whether the initial scan has completed at least once. Lets the command
  // layer distinguish "still scanning" from "scanned, no templates".
  public get isReady(): boolean {
    return this.ready;
  }

  // Start watching both roots and kick off the initial scan. The scan runs
  // asynchronously and is intentionally **not** awaited, so activation never
  // blocks (ADR-0025 §13). Watchers are created synchronously first so events
  // during the scan are not missed.
  public start(): void {
    if (this.disposed) {
      return;
    }
    const wsRel = this.workspaceFolderSetting();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      this.addWatcher(new vscode.RelativePattern(folder, `${wsRel}/**/*.md`));
    }
    this.addWatcher(new vscode.RelativePattern(this.userRootUri(), "**/*.md"));
    void this.scanAll();
  }

  // The resolved templates, optionally filtered to a single `kind`. The
  // create flow asks for `"file"`; `"snippet"` is reserved for Sprint 8.
  public getTemplates(kind?: TemplateKind): ResolvedTemplate[] {
    return kind ? filterByKind(this.resolved, kind) : [...this.resolved];
  }

  // The resolved template whose canonical basename matches (case-insensitive;
  // a trailing `.md` on the argument is ignored). `undefined` when none.
  public getTemplate(basename: string): ResolvedTemplate | undefined {
    const key = basename.toLowerCase().replace(/\.md$/i, "");
    return this.resolved.find((t) => t.basename.toLowerCase() === key);
  }

  // Expand `template` with `title`, create the target note if it does not
  // exist (never overwrite), and open it in MarkStudio at the cursor line.
  public async createFromTemplate(
    template: ResolvedTemplate,
    title: string
  ): Promise<void> {
    const sourceUri = vscode.Uri.parse(template.path);
    let raw: string;
    try {
      raw = await this.readFile(sourceUri);
    } catch {
      void vscode.window.showErrorMessage(
        `MarkStudio: could not read template "${template.basename}".`
      );
      return;
    }

    const { meta, body } = parseFrontMatter(raw);
    const outputPattern = meta?.output ?? "{{filename}}.md";
    const clipboard = await this.readClipboard();

    // First pass: expand the output path with a provisional filename derived
    // from the title, so the final on-disk name is known.
    const provisional = sanitizeFilename(title);
    const baseContext = this.buildContext(title, provisional, clipboard);
    let outputPath = expand(outputPattern, baseContext);
    if (!/\.(md|markdown)$/i.test(outputPath)) {
      outputPath += ".md";
    }

    const targetUri = this.resolveOutputUri(outputPath);
    if (targetUri === null) {
      void vscode.window.showErrorMessage(
        "MarkStudio: open a folder before creating a note from a template."
      );
      return;
    }

    // Second pass: expand the body with the *final* filename.
    const finalFilename = basenameNoExt(targetUri.path);
    const bodyContext: ExpandContext = {
      ...baseContext,
      filename: finalFilename
    };
    const cursorLine = meta?.cursor ?? findCursorMarker(body) ?? 0;

    await this.writeIfMissingThenOpen(
      targetUri,
      () => expand(body, bodyContext),
      cursorLine
    );
  }

  // Resolve today's daily note via the configured daily template, expand
  // `{{date}}`, and create-if-missing / open-if-exists in MarkStudio. Falls
  // back to an empty note under the configured folder when no daily template
  // exists. One-key — no picker, no title prompt (ADR-0025 §8, §10).
  public async openOrCreateDailyNote(): Promise<void> {
    const config = vscode.workspace.getConfiguration(SECTION);
    const dateFormat = config.get<string>(
      "dailyNotes.dateFormat",
      DEFAULTS.dateFormat
    );
    const title = format(new Date(), dateFormat);

    const templateName = config.get<string>(
      "dailyNotes.template",
      DEFAULTS.dailyTemplate
    );
    const template = this.getTemplate(templateName);
    if (template) {
      await this.createFromTemplate(template, title);
      return;
    }

    // No daily template configured: create a minimal note under the folder.
    const folder = config.get<string>(
      "dailyNotes.folder",
      DEFAULTS.dailyFolder
    );
    const targetUri = this.resolveOutputUri(`${folder}/${title}.md`);
    if (targetUri === null) {
      void vscode.window.showErrorMessage(
        "MarkStudio: open a folder before opening today's note."
      );
      return;
    }
    await this.writeIfMissingThenOpen(targetUri, () => `# ${title}\n`, 0);
  }

  // Write the opt-in starter template into the workspace templates folder
  // (create-if-missing) and open it so the user can customise it.
  public async createExampleTemplate(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      void vscode.window.showErrorMessage(
        "MarkStudio: open a folder before creating an example template."
      );
      return;
    }
    const wsRel = this.workspaceFolderSetting();
    const targetUri = vscode.Uri.joinPath(
      folders[0].uri,
      ...splitPath(wsRel),
      `${EXAMPLE_TEMPLATE_BASENAME}.md`
    );
    await this.writeIfMissingThenOpen(
      targetUri,
      () => EXAMPLE_TEMPLATE_CONTENT,
      0
    );
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rebuildTimer !== undefined) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = undefined;
    }
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.changeEmitter.dispose();
  }

  // --- internals ---------------------------------------------------------

  // Create `targetUri` from `buildContent()` when it does not exist (never
  // overwrite), then open it in MarkStudio at `cursorLine`. An existing target
  // is opened with a status-bar notice (ADR-0025 §7).
  private async writeIfMissingThenOpen(
    targetUri: vscode.Uri,
    buildContent: () => string,
    cursorLine: number
  ): Promise<void> {
    if (await this.fileExists(targetUri)) {
      vscode.window.setStatusBarMessage(STATUS_EXISTS, 4000);
    } else {
      try {
        await vscode.workspace.fs.writeFile(
          targetUri,
          Buffer.from(buildContent(), "utf8")
        );
      } catch {
        void vscode.window.showErrorMessage(
          `MarkStudio: could not create "${vscode.workspace.asRelativePath(targetUri)}".`
        );
        return;
      }
    }
    await this.provider.openInMarkStudio(targetUri, cursorLine);
  }

  private addWatcher(pattern: vscode.RelativePattern): void {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate(() => this.scheduleRebuild());
    watcher.onDidChange(() => this.scheduleRebuild());
    watcher.onDidDelete(() => this.scheduleRebuild());
    this.watchers.push(watcher);
  }

  private scheduleRebuild(): void {
    if (this.disposed || this.rebuildTimer !== undefined) {
      return;
    }
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = undefined;
      void this.scanAll();
    }, REBUILD_DEBOUNCE_MS);
  }

  private async scanAll(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const wsRel = this.workspaceFolderSetting();
    const wsTemplates: ScannedTemplate[] = [];
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (let i = 0; i < folders.length; i++) {
      const baseUri = vscode.Uri.joinPath(folders[i].uri, ...splitPath(wsRel));
      wsTemplates.push(...(await this.scanFolder(baseUri, "workspace", i)));
    }
    const userTemplates = await this.scanFolder(this.userRootUri(), "user");

    if (this.disposed) {
      return;
    }
    this.resolved = resolve(wsTemplates, userTemplates);
    this.ready = true;
    this.changeEmitter.fire();
  }

  // Recursively read every `.md` file under `baseUri`, parsing each one's
  // front-matter for `kind` + `description`. A non-existent folder yields an
  // empty list (the common empty-state case).
  private async scanFolder(
    baseUri: vscode.Uri,
    source: ScannedTemplate["source"],
    workspaceFolderIndex?: number
  ): Promise<ScannedTemplate[]> {
    const out: ScannedTemplate[] = [];
    await this.walk(baseUri, source, workspaceFolderIndex, out);
    return out;
  }

  private async walk(
    dirUri: vscode.Uri,
    source: ScannedTemplate["source"],
    workspaceFolderIndex: number | undefined,
    out: ScannedTemplate[]
  ): Promise<void> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return;
    }
    for (const [name, type] of entries) {
      const childUri = vscode.Uri.joinPath(dirUri, name);
      if (type === vscode.FileType.Directory) {
        await this.walk(childUri, source, workspaceFolderIndex, out);
      } else if (/\.md$/i.test(name)) {
        const scanned = await this.scanFile(
          childUri,
          source,
          workspaceFolderIndex
        );
        if (scanned !== null) {
          out.push(scanned);
        }
      }
    }
  }

  private async scanFile(
    uri: vscode.Uri,
    source: ScannedTemplate["source"],
    workspaceFolderIndex?: number
  ): Promise<ScannedTemplate | null> {
    let text: string;
    try {
      text = await this.readFile(uri);
    } catch {
      return null;
    }
    const { meta } = parseFrontMatter(text);
    const scanned: ScannedTemplate = {
      basename: basenameNoExt(uri.path),
      path: uri.toString(),
      source,
      kind: meta?.kind ?? "file",
      ...(meta?.description !== undefined
        ? { description: meta.description }
        : {}),
      ...(workspaceFolderIndex !== undefined ? { workspaceFolderIndex } : {})
    };
    return scanned;
  }

  private buildContext(
    title: string,
    filename: string,
    clipboard: string
  ): ExpandContext {
    const config = vscode.workspace.getConfiguration(SECTION);
    return {
      now: new Date(),
      dateFormat: config.get<string>(
        "dailyNotes.dateFormat",
        DEFAULTS.dateFormat
      ),
      title,
      filename,
      workspaceName: vscode.workspace.name ?? "",
      clipboard
    };
  }

  private resolveOutputUri(outputPath: string): vscode.Uri | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return null;
    }
    return vscode.Uri.joinPath(folders[0].uri, ...splitPath(outputPath));
  }

  private workspaceFolderSetting(): string {
    return vscode.workspace
      .getConfiguration(SECTION)
      .get<string>("templates.workspaceFolder", DEFAULTS.workspaceFolder);
  }

  private userRootUri(): vscode.Uri {
    const configured = vscode.workspace
      .getConfiguration(SECTION)
      .get<string>("templates.userFolder", DEFAULTS.userFolder);
    if (configured && configured.trim() !== "") {
      return vscode.Uri.file(configured);
    }
    return vscode.Uri.joinPath(this.context.globalStorageUri, "templates");
  }

  private async readClipboard(): Promise<string> {
    try {
      return await vscode.env.clipboard.readText();
    } catch {
      return "";
    }
  }

  private async readFile(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  }

  private async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}

// Split a `/`-separated (or `\`-separated) relative path into non-empty,
// non-`.` segments for `vscode.Uri.joinPath`.
function splitPath(path: string): string[] {
  return path
    .split(/[\\/]+/)
    .filter((segment) => segment !== "" && segment !== ".");
}

// The basename of a URI path with one trailing `.md`/`.markdown` extension
// stripped.
function basenameNoExt(path: string): string {
  const slash = path.lastIndexOf("/");
  const name = slash === -1 ? path : path.slice(slash + 1);
  return name.replace(/\.(md|markdown)$/i, "");
}

// Make a title safe to use as a filename component: replace characters illegal
// on common filesystems with `-`, trim, and never return empty.
function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, "-").trim();
  return cleaned.length > 0 ? cleaned : "untitled";
}
