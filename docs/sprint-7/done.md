# Sprint 7 — Done (M5.1 Templates + M5.3 Daily Notes)

> Close-out record. Written by the Producer at merge. History lives in git.

---

## Outcome

**M5.1 (Templates engine) + M5.3 (Daily notes)** are **complete on `feature/sprint-7`, merged to `main` via `--no-ff`**.

One engine, two consumers. Three native commands now ship:

- **`MarkStudio: New Note from Template`** (`markstudio.templates.create`) — native QuickPick over the resolved workspace + user templates → title `InputBox` (always shown for `kind: file`, empty → template basename) → create + open **in MarkStudio**.
- **`MarkStudio: Open Today's Note`** (`markstudio.dailyNotes.openToday`) — one keystroke, no InputBox: create-or-open today's daily note from the configured template, opened in MarkStudio.
- **`MarkStudio: Create Example Template`** (`markstudio.templates.openExample`) — opt-in starter `daily` template; no auto-bootstrap.

- **Branch:** `feature/sprint-7` (off `main` `397c7df`); 7 commits + the Phase E docs commit.
- **ADR:** **ADR-0025** — Templates engine + daily notes (zero-dep, closed allowlist, never-overwrite, opens-in-MarkStudio, no auto-bootstrap).
- **This opens Phase 5 — Authoring Workflows.** Next: M5.2 — Snippets (Sprint 8). M5.4 — Workspace note features deferred.

## Verification

- **Automated — PASS (461 tests, 0 failures):** 374 unit (+58) · 71 integration (+6) · 16 exthost (+3).
- **Gate:** `npm run lint` (eslint `--max-warnings 0` + prettier) · `npm run typecheck` · `npm run typecheck:test` · `npm run build` — all green.
- **Bundle deltas:** host `dist/extension.js` **~88 → 94.9 kB** (+~6.9 kB for the templates engine + commands). Preview, Mermaid, and graph bundles unchanged.
- **Producer F5:** completed — create from workspace + user templates; title-driven filename + `{{cursor}}` placement; daily note one-key + idempotent re-open; collision → existing file opens with status notice; opt-in Create Example Template; theme matrix (dark / light / high-contrast). All pass.
- QA sign-off: [../qa/sprint-7-signoff.md](../qa/sprint-7-signoff.md).

## Commits

| Commit | Description |
|---|---|
| `9b126d2` | docs(sprint-7): plan + progress (Phase A start) |
| `1e8ecc0` | docs(sprint-7): ADR-0025 + design/templates.md (Phase A) |
| `e600516` | feat(templates): pure engine modules (M5.1, Phase B) |
| `dd97305` | feat(templates): TemplateService + commands + activation wiring (Phase C) |
| `41099e5` | docs(sprint-7): mark Phase C complete in progress tracker |
| `e5bb617` | test(templates): integration + exthost coverage (Phase D) |
| `056efa3` | docs(sprint-7): mark Phase D complete (test counts, gate status) |
| `9f5306c` | docs(sprint-7): Phase E close-out — M5.1 Templates + M5.3 Daily notes |

## What shipped

### Host (extension)

- `src/templates/frontMatterParser.ts` (new, pure) — in-tree fixed-schema `---` front-matter reader → `{ meta, body }`. Recognises `kind` / `description` / `output` / `cursor`; unknown keys → `meta.extras`; malformed → `meta: null`. No YAML dependency.
- `src/templates/dateFormatter.ts` (new, pure) — `format(date, pattern, tz?)` over `YYYY` / `MM` / `DD` / `HH` / `mm`, built on `Intl.DateTimeFormat` parts. No `dayjs` / `date-fns`.
- `src/templates/variableExpander.ts` (new, pure) — `expand(template, ctx)` over a closed allowlist + `{{cursor}}` discovery + `slugify`. Snippet `${N}` and unknown `{{token}}` pass through verbatim (the M5.2 seam).
- `src/templates/templateResolver.ts` (new, pure) — `resolve(ws[], user[])` merges by basename (workspace wins, first-root-wins, stable display-name sort); `filterByKind`.
- `src/templates/TemplateService.ts` (new, vscode-aware) — async scan of both roots + two `FileSystemWatcher`s (`RelativePattern`) + 250 ms debounced rebuild + `onDidChangeTemplates`. Two-pass create; never overwrites (collision opens the existing file with a status notice); every open routes through `provider.openInMarkStudio`. User root = configured folder or `globalStorageUri/templates`. Exposed on `MarkStudioExtensionApi`.
- `src/commands/registerTemplates.ts` (new) — owns the three command IDs + the QuickPick → InputBox flow; delegates all logic to `TemplateService`. Inert `$(info) No templates found` empty state.
- `src/extension.ts` — constructs + starts `TemplateService`; registers commands; exposes `templateService` on the API.
- `package.json` — +3 commands (category "MarkStudio"); +5 settings (`markstudio.templates.{workspaceFolder,userFolder}`, `markstudio.dailyNotes.{template,folder,dateFormat}`). No commandPalette menu entries, no keybinding, no new view.

### Producer non-negotiables held

- **Zero new runtime dependency** (in-tree front-matter parser + date formatter; `gray-matter` / `dayjs` / `date-fns` / Handlebars all rejected).
- **Closed variable allowlist** — snippet `${N}` and unknown tokens pass through verbatim.
- **Never overwrite** — a collision opens the existing file with a status notice.
- **All opens route through `provider.openInMarkStudio`** → `markstudio.editor` (never `showTextDocument`).
- **No auto-bootstrap** — `Create Example Template` is opt-in.
- **Native QuickPick only; no webview / protocol / esbuild change; no keybinding; no Memento.**
- **First-root-wins** multi-root; title InputBox always shown for `kind: file`; daily notes one-key.

### Tests

- `test/templates/*.test.ts` (new, +58 unit) — front-matter parse (valid / malformed / extras); date formatter (tokens, tz); variable expander (allowlist, `{{cursor}}`, slugify, `${N}` + unknown-token pass-through); resolver (workspace-wins, first-root-wins, stable sort, filterByKind).
- `test/integration/templateService.test.ts` (new, +6) — scan on start; rebuild on watcher create; workspace-wins over user; expand + create + open; never-overwrite (sentinel preserved + notice + still opens); openExample idempotent.
- `test/exthost/suite/templates.test.ts` (new, +3) — three commands contributed; Create Example writes + opens `TabInputCustom`; Open Today's Note creates `daily/<date>.md` + opens + idempotent re-open. `templates.create` never executed (would block on the QuickPick).
- `test/_mocks/vscode.ts` — widened with `workspace.fs`, `Uri.parse`/`joinPath`, `RelativePattern`, `FileType`, a `MockFileSystemWatcher`, `env.clipboard`, `window.setStatusBarMessage`/`showErrorMessage`, and `__set*`/`__get*`/`__fireWatcher` helpers.

### Docs

- **New ADR-0025** in `docs/DECISIONS.md`.
- **New `docs/design/templates.md`** — schema, variables, resolution, two-pass create, non-negotiables.
- `docs/CHANGELOG.md` — new `Added` entry at the top of `## [Unreleased]`.
- `docs/ROADMAP.md` — Phase 5 → In progress; M5.1 + M5.3 Done; M5.2 Next; M5.4 Deferred.
- `docs/FEATURES.md` — Phase 5 section rewritten.
- `docs/TODO.md` — M5.1 + M5.3 moved to Done; M5.2 Snippets added to High Priority.
- `docs/PROJECT_STATUS.md` — §1 snapshot + §2 focus + Completed Features + In Progress rewritten.
- `docs/ARCHITECTURE.md` — §3 module layout + §4 component table gain the templates entries.
- `docs/sprint-7/plan.md` — sprint source of truth (unchanged).
- `docs/sprint-7/progress.md` — phase-by-phase tracker with all commit hashes.
- `docs/qa/sprint-7-signoff.md` — QA sign-off (Ivy).
- `docs/AGENT_HANDOFF.md` — overwritten for Sprint 7.

## Bundle deltas

| Bundle | Before (Sprint 6) | After (Sprint 7) | Delta |
|---|---|---|---|
| `dist/extension.js` | ~88 kB | **94.9 kB** | **+~6.9 kB** |
| `dist/webview.js` | ~2.0 MB | ~2.0 MB | unchanged |
| `dist/mermaid.js` | ~7.5 MB | ~7.5 MB | unchanged |
| `dist/graph.js` | 19.3 kB | 19.3 kB | unchanged |

## Phase summary

| Phase | Status | Output |
|---|---|---|
| **A — ADR + design** | ✅ committed `1e8ecc0` | ADR-0025; `design/templates.md` |
| **B — Pure engine modules** | ✅ committed `e600516` | 4 pure modules + 58 unit tests; gate 374 unit |
| **C — Service + commands** | ✅ committed `dd97305` | `TemplateService` + `registerTemplates` + extension wiring + `package.json`; host 94.9 kB |
| **D — Integration + exthost tests** | ✅ committed `e5bb617` | mock widening + 6 integration + 3 exthost; gate 374 / 71 / 16 |
| **E — Docs + close-out** | ✅ committed `9f5306c` | this doc; QA sign-off; CHANGELOG / ROADMAP / FEATURES / TODO / PROJECT_STATUS / ARCHITECTURE / AGENT_HANDOFF |

## Compliance checklist

| Producer rule | Status |
|---|---|
| Zero new runtime dependency | ✅ (no `package.json` `dependencies` delta) |
| Closed variable allowlist; `${N}` passes through | ✅ |
| Never overwrite | ✅ (collision opens existing + status notice) |
| All opens via `provider.openInMarkStudio` | ✅ (exthost asserts `TabInputCustom`) |
| No auto-bootstrap | ✅ (`Create Example Template` opt-in) |
| Native QuickPick only | ✅ |
| No webview / protocol / esbuild change | ✅ |
| No keybinding, no new view, no Memento | ✅ |
| First-root-wins multi-root | ✅ |
| One phase per commit | ✅ (A → E) |
| Producer does the `--no-ff` merge | ✅ |

## Handoff

The next agent picks up from `docs/AGENT_HANDOFF.md` (Sprint 7 close-out). After this merge to `main`, the next focus is **M5.2 — Snippets (Sprint 8)** per `docs/ROADMAP.md` §5 — layering tab-stop placeholders (`${1}` / `${1:default}` / `${0}`) on the M5.1 expander's `${N}` pass-through + the CodeMirror 6 snippet session.
