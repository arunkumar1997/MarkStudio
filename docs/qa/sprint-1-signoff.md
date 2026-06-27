# QA Sign-off — Sprint 1 / T-3.5 (M3.5 Footnotes & GFM completeness)

> QA: **Ivy**. Date: 2026-06-27. Branch under test: `feature/sprint-1` (NOT merged).
> Scope: footnotes, GFM task lists, GFM tables, strikethrough — each individually
> toggleable, degrading gracefully when off. Acceptance checklist:
> [docs/sprint-1/plan.md](../sprint-1/plan.md) §5.

---

## Verdict: ✅ PASS — WITH NOTES

The automated portion of the Definition of Done is fully green and every
feature's render / degrade / live-toggle behaviour is covered. Two notes gate a
clean close (neither is a blocker):

1. **QA added a regression test** to close a minor boundary-guard coverage gap
   (see §3). It is on `feature/sprint-1` and must travel with the branch.
2. **Manual EDH (F5) pixel/theme matrix is outstanding** — it cannot run under
   automation and is documented as a human checklist in §5. It is a spot-check,
   not a code gate; recommend the Producer (or Ivy) runs it once before/at merge.

No defects were found. The branch is **ready for Producer merge to `main`** once
the manual EDH spot-check in §5 is signed (regular merge, never squash/rebase per
plan §8).

---

## 1. Pipeline results (local, `feature/sprint-1`)

| Stage | Command | Result | Count |
|---|---|---|---|
| Lint + format | `npm run lint` | ✅ PASS | eslint 0 warnings · prettier all-clean |
| Typecheck (prod) | `npm run typecheck` | ✅ PASS | tsc 0 errors |
| Typecheck (test) | `npm run typecheck:test` | ✅ PASS | tsc 0 errors |
| Build | `npm run build` | ✅ PASS | `dist/webview.js` 2.0 MB · `dist/extension.js` 25.4 KB · `dist/mermaid.js` 7.5 MB |
| Unit | `npm test` → `test:unit` | ✅ PASS | **94 / 94** (0 fail) — was 93; +1 added by QA (§3) |
| Integration | `npm test` → `test:integration` | ✅ PASS | **39 / 39** (0 fail) |
| Ext-host | `npm run test:exthost` | ✅ PASS | **4 / 4** (0 fail) |

> Note: esbuild writes its banner to stderr, which PowerShell surfaces as a
> `NativeCommandError` line. It is cosmetic — every stage exited `0`. The
> ext-host run also logs a benign `Error mutex already exists` from
> `@vscode/test-electron` (a second VS Code instance); all 4 lifecycle tests
> still pass and the host exits `0`.

---

## 2. Automated coverage assessment — per feature

Required cases per feature: (a) renders when toggle ON, (b) degrades gracefully
when OFF (literal `[^1]` / `[ ]` / `~~`, plain-text table), (c) live `setConfig`
toggle. All present in
[test/integration/previewRenderer.test.ts](../../test/integration/previewRenderer.test.ts).

| Feature | (a) ON renders | (b) OFF degrades | (c) live toggle | Extra |
|---|---|---|---|---|
| **Footnotes** | ✅ `.footnote-ref` + `section.footnotes` + `.footnote-backref` | ✅ literal `[^1]`, no section | ✅ `setConfig` on → ref appears | — |
| **Task lists** | ✅ 2 checkboxes, `li.markstudio-task-list-item` | ✅ literal `[ ] Todo`, no checkbox | ✅ `setConfig` on → checkbox | ✅ **checkbox `disabled === true`** asserted; `[ ]`=unchecked, `[x]`=checked; plain bullet gets no checkbox |
| **Tables** | ✅ `<table>` with 2×`th` / 2×`td` | ✅ plain text `\| A \| B \|`, no `<table>` | ✅ `setConfig` on → table | — |
| **Strikethrough** | ✅ `<s>/<del>` wraps `gone` | ✅ literal `~~gone~~` | ✅ `setConfig` on → struck | — |

**Disabled-checkbox requirement (no source write-back):** ✅ confirmed.
`todoify` emits `<input … disabled>` (never `checked`-writable), and the test
asserts `first.disabled === true`. No `change`/`click` handler is wired to the
preview checkbox — read-only per Producer decision.

**ConfigurationService cases** in
[test/services/ConfigurationService.test.ts](../../test/services/ConfigurationService.test.ts):
✅ default-true + explicit-false override for each of `footnotes`, `taskLists`,
`tables`, `strikethrough`, plus full-snapshot `deepEqual` assertions.

**Coverage GAP found & closed:** the `isMarkStudioConfig` boundary guard now
validates 4 new booleans, but the only rejection tests used `lineNumbers: "yes"`
or a fully-empty `{}` — a regression dropping any one *new* flag's check would
have gone undetected. QA added a parameterised rejection test (§3).

---

## 3. Test added by QA (gap closure)

`test/messaging/messages.test.ts` — new case in the `configChanged` block:

> *"rejects a config missing any one T-3.5 flag
> (footnotes/taskLists/tables/strikethrough)"* — clones `VALID_CONFIG`, deletes
> each new flag in turn, and asserts `isHostToWebviewMessage` returns `false`.

Result: unit suite **93 → 94**, all green; lint + `typecheck:test` clean. This is
a test-only change (no application source touched), consistent with QA's mandate.

---

## 4. Config seam + guardrails verification

**Config seam (plan §3):**
- ✅ `package.json` contributes `markstudio.preview.footnotes` / `.taskLists` /
  `.tables` / `.strikethrough` — all `type: boolean`, `default: true`,
  `scope: resource` (mirrors M3.1–M3.4).
- ✅ `MarkStudioConfig` extended with the 4 readonly flags
  ([src/messaging/messages.ts](../../src/messaging/messages.ts)).
- ✅ `isMarkStudioConfig` validates all 4 as `boolean`.
- ✅ `ConfigurationService.read` resolves each via
  `config.get<boolean>("preview.<flag>", true)`.
- ✅ Fixtures updated across **all 4** config-bearing test files:
  `ConfigurationService.test.ts`, `previewRenderer.test.ts`,
  `messages.test.ts`, `createEditor.test.ts` (confirmed by green `typecheck:test`,
  which requires every `MarkStudioConfig`-typed literal to carry all 10 fields).

**Architecture guardrails (plan §6):**
- ✅ **One markdown-it instance** on the hot path; `createMarkdownIt` is called
  once and rebuilt **only** when a preview flag flips (`setConfig` early-returns
  when no flag changed). Per-keystroke `update()` reuses the instance.
- ✅ **Block-diff DOM patching untouched** — `patch()` (LCP/LCS prefix/suffix)
  and `groupTopLevelTokens` are unchanged from the T-3.4 baseline.
- ✅ **No new dependency for tables/strikethrough** — toggled via the built-in
  rulers (`md.disable("table")` / `md.disable("strikethrough")`).
- ✅ **Task lists dependency-free** — in-tree core rule
  ([src/webview/preview/taskLists.ts](../../src/webview/preview/taskLists.ts)).
- ✅ **Only `markdown-it-footnote` added** (runtime dep `^4.0.0` +
  `@types/markdown-it-footnote` dev). No other new runtime deps.
- ✅ Styled entirely via `--vscode-*` variables (no custom design system, no
  framework) in [src/webview/main.ts](../../src/webview/main.ts).

---

## 5. Manual EDH (F5) verification matrix — HUMAN CHECKLIST (outstanding)

Automation (jsdom) cannot verify theme variables, pixels, or no-reload/no-flicker
behaviour. Run `F5` (Extension Development Host), open a `.md` with all four
features, and confirm in **dark**, **light**, and **high-contrast** themes:

### Footnotes
- [ ] `[^1]` renders as a small superscript reference; clicking it jumps to the def.
- [ ] Footnotes section sits below a separator rule; each def has a back-ref `↩`
      link that returns to the reference.
- [ ] Ref/back-ref colour follows `--vscode-textLink-foreground`; readable in all 3 themes.

### Task lists
- [ ] `- [ ]` / `- [x]` render as checkboxes; correct checked/unchecked state.
- [ ] Checkboxes are **disabled** (cannot be clicked/toggled; cursor not interactive).
- [ ] No bullet/indent; checkbox aligns with the item text on one baseline.
- [ ] Accent colour (`--vscode-focusBorder`) visible in all 3 themes incl. high-contrast.

### Tables
- [ ] Pipe table renders with visible 1px borders; header row tinted.
- [ ] Borders use `--vscode-editorGroup-border`; readable and not invisible in high-contrast.

### Strikethrough
- [ ] `~~text~~` renders struck through, dimmed via `--vscode-descriptionForeground`.

### Live toggle (each of the 4 settings, no reload)
- [ ] Turning each `markstudio.preview.*` OFF in Settings degrades the preview to
      literal/plain text **without** a webview reload, editor recreation, or flicker.
- [ ] Turning it back ON restores rendering live.
- [ ] Cursor/scroll position in the editor is preserved across the toggle.

> Until this matrix is run by a human, the visual/theming portion of plan §5
> ("correct in dark/light/high-contrast", "live rebuild without recreation") is
> **assumed-from-code** but not pixel-verified.

---

## 6. Bugs filed

**None.** No functional defects were found in automated verification.

The one issue uncovered (the missing guard-rejection test) was a *test* gap, not
an application defect, and QA closed it directly (§3) rather than filing it.

> Note: GitHub CLU/CLI availability was not assumed; had any defect required an
> Issue, the title/body/severity text would be provided here for the Producer to
> file. No Issues are needed for this sprint.

---

## 7. Sign-off summary

| Item | State |
|---|---|
| Pipeline (lint/typecheck/typecheck:test/build/test/exthost) | ✅ all green |
| Unit / Integration / Ext-host counts | 94 / 39 / 4 |
| Per-feature render·degrade·toggle coverage | ✅ complete |
| Disabled task-list checkboxes (no write-back) | ✅ verified |
| Config seam (package.json · guard · ConfigurationService · fixtures) | ✅ verified |
| Guardrails (1 md-it instance · block-diff intact · no extra deps) | ✅ verified |
| Coverage gap closed by QA | ✅ guard-rejection test added |
| Manual EDH theme matrix | ☐ outstanding (human spot-check) |
| Bugs filed | none |
| **Verdict** | **✅ PASS — WITH NOTES** |

**Recommendation to Producer:** merge-ready. Run the §5 manual matrix once, then
regular-merge `feature/sprint-1` → `main` (no squash/rebase). Commit QA's added
test with a `test:` message and push before merge.
