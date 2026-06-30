// Pure two-root template resolver for MarkStudio templates (M5.1, ADR-0025).
//
// Merges templates from the workspace root and the user root by canonical
// basename (case-insensitive), with WORKSPACE WINNING on a collision, then
// sorts deterministically by display name. Imports nothing from `vscode` or
// the DOM — the service does the scanning and hands two flat arrays here.

import type { TemplateKind } from "./frontMatterParser";

// Which root a template came from. Surfaced in the QuickPick `detail` slot so
// a basename collision is visible to the user (ADR-0025 §6).
export type TemplateSource = "workspace" | "user";

// A template discovered by a scan, before precedence is applied. `path` is the
// stable identity the service maps back to a `vscode.Uri`; `basename` is the
// file name without directory or extension.
export interface ScannedTemplate {
  readonly basename: string;
  readonly path: string;
  readonly source: TemplateSource;
  readonly kind: TemplateKind;
  readonly description?: string;
  // For a workspace template in a multi-root vault, the 0-based index of the
  // workspace folder it was found in. Lower wins (first-root-wins, ADR-0025
  // §6). Omitted (treated as 0) for user templates.
  readonly workspaceFolderIndex?: number;
}

// A template after two-root precedence + ordering have been applied. Same shape
// as `ScannedTemplate`; one entry per canonical basename.
export type ResolvedTemplate = ScannedTemplate;

// Merge the two roots. Workspace templates win over user templates on a shared
// canonical basename; within the workspace root, a lower `workspaceFolderIndex`
// wins (first-root-wins). The result is sorted by display name
// (case-insensitive, then a stable tie-break on the canonical basename).
export function resolve(
  workspaceTemplates: readonly ScannedTemplate[],
  userTemplates: readonly ScannedTemplate[]
): ResolvedTemplate[] {
  const byBasename = new Map<string, ScannedTemplate>();

  // User templates first, so a workspace template with the same basename
  // overwrites it below.
  for (const template of userTemplates) {
    const key = canonicalKey(template.basename);
    if (!byBasename.has(key)) {
      byBasename.set(key, template);
    }
  }

  for (const template of workspaceTemplates) {
    const key = canonicalKey(template.basename);
    const existing = byBasename.get(key);
    if (
      existing === undefined ||
      existing.source === "user" ||
      folderIndexOf(template) < folderIndexOf(existing)
    ) {
      byBasename.set(key, template);
    }
  }

  return [...byBasename.values()].sort(compareForDisplay);
}

// Optionally filter to a single kind (`"file"` for the create flow, `"snippet"`
// reserved for Sprint 8). Stable: preserves the resolved ordering.
export function filterByKind(
  templates: readonly ResolvedTemplate[],
  kind: TemplateKind
): ResolvedTemplate[] {
  return templates.filter((template) => template.kind === kind);
}

function canonicalKey(basename: string): string {
  return basename.toLowerCase();
}

function folderIndexOf(template: ScannedTemplate): number {
  return template.workspaceFolderIndex ?? 0;
}

function compareForDisplay(a: ScannedTemplate, b: ScannedTemplate): number {
  const byName = a.basename
    .toLowerCase()
    .localeCompare(b.basename.toLowerCase());
  if (byName !== 0) {
    return byName;
  }
  // Stable tie-break so two basenames differing only in case order
  // deterministically.
  return a.basename.localeCompare(b.basename);
}
