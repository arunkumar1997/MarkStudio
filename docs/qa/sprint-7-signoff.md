# QA Sign-off — Sprint 7 / M5.1 Templates + M5.3 Daily notes

> QA: **Ivy**. Date: 2026-06-30. Branch under test: `feature/sprint-7` (PR open → `main`, NOT merged).
> Scope: a templates engine (M5.1) and daily notes (M5.3) — one engine, two consumers. Three native commands: `MarkStudio: New Note from Template` (native QuickPick → title InputBox → create + open in MarkStudio), `MarkStudio: Open Today's Note` (one-key create-or-open), `MarkStudio: Create Example Template` (opt-in starter `daily` template). Four pure modules (`frontMatterParser`, `dateFormatter`, `variableExpander`, `templateResolver`) + one host `TemplateService` (two-root async scan, two `FileSystemWatcher`s, 250 ms debounce, `onDidChangeTemplates`, two-pass create, never overwrite, opens via `provider.openInMarkStudio`) + `registerTemplates`. Five settings (`markstudio.templates.*`, `markstudio.dailyNotes.*`). Zero new runtime dependency; no webview / protocol / esbuild change; no keybinding; no new view.
> Design: [docs/design/templates.md](../design/templates.md) · ADR: [ADR-0025](../DECISIONS.md#adr-0025).

---

## Verdict

- **Automated: ✅ PASS — 461 tests** (374 unit + 71 integration + 16 ext-host), 0 failures.
  Lint, both typechecks, and the build all clean. **Every prior assertion intact.**
- **Manual EDH (F5):** Producer-owned sign-off per `sprint-7/plan.md` §6. Test plan documented in `AGENT_HANDOFF.md` §9.

The implementation matches the plan exactly: **zero new runtime dependency** (in-tree front-matter parser + date formatter); **closed variable allowlist** (snippet `${N}` and unknown tokens pass through verbatim, leaving the M5.2 seam open); **never overwrite** (a collision opens the existing file with a status-bar notice); **all opens route through `provider.openInMarkStudio`** (custom-editor tabs, never `showTextDocument`); **no auto-bootstrap** (`Create Example Template` is opt-in); native QuickPick only; first-root-wins multi-root; title InputBox always shown for `kind: file` (empty → basename); daily notes one-key, no InputBox.

**No application source was modified by QA.** The branch is **ready for Producer merge to `main`** (regular `--no-ff` merge, never squash/rebase, per plan §8).

---

## Evidence

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 warnings (eslint `--max-warnings 0` + prettier) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run typecheck:test` | ✅ 0 errors |
| `npm run build` | ✅ host **94.9 kB** (+~6.9 kB from Sprint 6) · preview ~2.0 MB · mermaid ~7.5 MB · graph 19.3 kB |
| `npm test` | ✅ 374 unit + 71 integration = **445**, 0 fail |
| `npm run test:exthost` | ✅ **16** Extension Host tests, 0 fail |
| **Total automated tests** | ✅ **461** (374 + 71 + 16), **0 fail** |
| Producer F5 matrix | ⏳ Producer-owned — pipeline gates above are the dev-team's deliverable |

## Test-layer breakdown

| Layer | Pre-Sprint-7 | Sprint 7 delta | After |
|---|---|---|---|
| Unit (`node:test`) | 316 | **+58** | **374** |
| Integration (jsdom) | 65 | **+6** | **71** |
| Ext-host (`@vscode/test-electron`) | 13 | **+3** | **16** |
| **Total** | **394** | **+67** | **461** |

Delta breakdown:

| Suite | Tests added | Coverage |
|---|---|---|
| `test/templates/*.test.ts` (new) | +58 | four pure modules: front-matter parse (valid / malformed / extras / no-fence); date formatter (token coverage, tz); variable expander (allowlist, `{{cursor}}`, slugify, `${N}` pass-through, unknown-token pass-through); resolver (workspace-wins, first-root-wins, stable sort, filterByKind) |
| `test/integration/templateService.test.ts` (new) | +6 | scans workspace on start; rebuilds on watcher create; workspace-wins over user on same basename; expands + creates + opens (`/ws/notes/My Note.md` content); never overwrites (sentinel preserved + status notice + still opens); openExample idempotent |
| `test/exthost/suite/templates.test.ts` (new) | +3 | three commands contributed; Create Example Template writes `.markstudio/templates/daily.md` + opens as `TabInputCustom`; Open Today's Note creates `daily/<date>.md` + opens + idempotent re-open |

## Boundary-guard / non-negotiable checks

| Check | Status |
|---|---|
| Zero new `package.json` `dependencies` entry | ✅ in-tree front-matter parser + date formatter |
| Closed variable allowlist; snippet `${N}` passes through verbatim | ✅ `variableExpander` + unit tests |
| Unknown `{{token}}` passes through verbatim (expansion is total) | ✅ unit test |
| Never overwrite — collision opens existing file + status notice | ✅ `writeIfMissingThenOpen`; integration "never overwrites" test (sentinel preserved) |
| All opens route through `provider.openInMarkStudio` (never `showTextDocument`) | ✅ exthost tests assert `TabInputCustom` |
| No auto-bootstrap — nothing written until a command runs | ✅ `Create Example Template` is the only writer of the starter template |
| Native QuickPick only (no custom webview picker) | ✅ `registerTemplates` |
| Title InputBox always shown for `kind: file` (empty → basename) | ✅ `runCreateFromTemplate` |
| Daily notes one-key (no InputBox) | ✅ `openOrCreateDailyNote` |
| First-root-wins across multi-root; workspace wins over user | ✅ `templateResolver` + integration "workspace-wins" test |
| Two-pass create resolves `{{filename}}` ↔ `output:` | ✅ `createFromTemplate`; integration create+open test |
| No webview / message-protocol / esbuild change | ✅ no edits under `src/webview/`, `src/messaging/`, or `esbuild.*.js` |
| No new keybinding | ✅ no `contributes.keybindings` entry |
| No Memento usage | ✅ |
| Five settings added under `markstudio.templates.*` / `markstudio.dailyNotes.*` | ✅ `package.json` |
| `templates.create` never executed in exthost (would block on QuickPick) | ✅ exthost suite only checks contribution + the two non-blocking commands |

## Known issues / not in scope (Producer-owned)

- **Producer F5 matrix.** Pipeline gates above are the dev-team's deliverable; Producer's F5 sweep is the human sign-off step per `sprint-7/plan.md` §6. Test plan documented in `AGENT_HANDOFF.md` §9 (create from workspace + user template; title-driven filename + `{{cursor}}` placement; daily note one-key + idempotent; collision → existing file opens with notice; opt-in Create Example Template; theme matrix).
- **Snippet `${N}` placeholders pass through but are not yet interactive.** By design — M5.2 (Sprint 8) wires them into a CM6 snippet session.
- **Front-matter parser is fixed-schema, not general YAML.** Intentional (zero-dep); documented in `design/templates.md`.
- **Daily-note folder is flat** (`markstudio.dailyNotes.folder`); nested `YYYY/MM/` hierarchies are out of scope for v1.

## Approval

QA approves the branch for merge.
— Ivy, 2026-06-30
