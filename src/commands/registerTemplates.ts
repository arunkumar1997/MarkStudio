import * as vscode from "vscode";
import type { TemplateService } from "../templates/TemplateService";
import type { ResolvedTemplate } from "../templates/templateResolver";

// Command identifiers contributed in package.json. Kept in one place to avoid
// the magic-string problem (CODING_GUIDELINES §4).
export const TEMPLATE_COMMAND_IDS = {
  create: "markstudio.templates.create",
  openExample: "markstudio.templates.openExample",
  dailyNotesOpenToday: "markstudio.dailyNotes.openToday"
} as const;

// A QuickPick item that carries the template it represents. The empty-state
// hint item carries no `template` and is inert when chosen.
interface TemplateQuickPickItem extends vscode.QuickPickItem {
  readonly template?: ResolvedTemplate;
}

// Registers the three M5.1 / M5.3 commands and returns a single disposable
// owning every registration. The command layer owns the native QuickPick /
// InputBox flow; all business logic lives in `TemplateService` (ADR-0025).
export function registerTemplates(service: TemplateService): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand(TEMPLATE_COMMAND_IDS.create, () => {
      void runCreateFromTemplate(service);
    }),
    vscode.commands.registerCommand(TEMPLATE_COMMAND_IDS.openExample, () => {
      void service.createExampleTemplate();
    }),
    vscode.commands.registerCommand(
      TEMPLATE_COMMAND_IDS.dailyNotesOpenToday,
      () => {
        void service.openOrCreateDailyNote();
      }
    )
  );
}

// Primary entry point: pick a file template, prompt for a title, create the
// note. The picker shows a non-selectable hint when no templates exist and
// never silently dismisses (ADR-0025 §"Empty-state UX").
async function runCreateFromTemplate(service: TemplateService): Promise<void> {
  const templates = service.getTemplates("file");
  const items = buildItems(templates);

  const picked = await vscode.window.showQuickPick(items, {
    title: "New Note from Template",
    placeHolder:
      templates.length === 0 ? "No templates found" : "Select a template…",
    matchOnDescription: true,
    matchOnDetail: true
  });

  // Cancelled, or the empty-state hint chosen (no template attached) → done.
  if (picked === undefined || picked.template === undefined) {
    return;
  }
  const template = picked.template;

  const typed = await vscode.window.showInputBox({
    title: "New Note from Template",
    prompt: `Title for the new note (from "${template.basename}")`,
    value: template.basename,
    placeHolder: template.basename
  });
  if (typed === undefined) {
    return; // cancelled
  }
  // Empty submission defaults to the template basename — never an empty title
  // (ADR-0025 §7).
  const title = typed.trim() === "" ? template.basename : typed.trim();

  await service.createFromTemplate(template, title);
}

// Build the QuickPick items: one per file template, or a single inert hint
// when there are none. Milo: Codicon + label + description + source detail.
function buildItems(
  templates: readonly ResolvedTemplate[]
): TemplateQuickPickItem[] {
  if (templates.length === 0) {
    return [
      {
        label: "$(info) No templates found",
        detail:
          'Create one in .markstudio/templates/ or run "MarkStudio: Create Example Template".'
      }
    ];
  }
  return templates.map((template) => ({
    label: `$(file) ${template.basename}`,
    description: template.description ?? "",
    detail:
      template.source === "workspace" ? "Workspace template" : "User template",
    template
  }));
}
