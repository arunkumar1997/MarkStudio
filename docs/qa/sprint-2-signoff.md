# QA Sign-off — Sprint 2 / T-4.1 (M4.1 Backlinks panel + wiki-link resolver)

> QA: **Ivy**. Date: 2026-06-27. Branch under test: `feature/sprint-2` (NOT merged).
> Scope: host-side workspace link index, case-insensitive basename wiki-link
> resolver, and a native `MarkStudio Backlinks` Explorer tree view that follows
> the active note and updates live. Acceptance checklist:
> [docs/sprint-2/plan.md](../sprint-2/plan.md) §6.

---

## Verdict: ✅ PASS — WITH NOTES

The automated portion of the Definition of Done is fully green. The pure modules
(`parseWikiTargets`, `linkIndex`) are comprehensively covered against the
Producer's resolution rules, the view contribution is correct and additive, and
every guardrail (host-side only, non-blocking activation, debounced incremental
index, pure parser/resolver) holds. Two notes gate a clean close — neither is a
blocker:

1. **QA added 3 regression tests** to close real untested code paths (CRLF line
   numbering, `.markdown` extension resolution, case-insensitive self-link
   guard). They are on `feature/sprint-2` and must travel with the branch.
2. **Manual EDH (F5) matrix is outstanding** — it cannot run under automation
   (no jsdom surface for `FileSystemWatcher`, `findFiles`, the tree view, or
   click-to-open). It is documented as a human checklist in §5. It is a
   spot-check, not a code gate.

**No defects were found.** No bugs filed. The branch is **ready for Producer
merge to `main`** once the manual EDH spot-check in §5 is signed (regular merge,
never squash/rebase per plan §8).

---

## 1. Pipeline results (local, `feature/sprint-2`)

| Stage | Command | Result | Count |
|---|---|---|---|
| Lint + format | `npm run lint` | ✅ PASS | eslint 0 warnings (`--max-warnings 0`) · prettier all-clean |
| Typecheck (prod) | `npm run typecheck` | ✅ PASS | tsc 0 errors |
| Typecheck (test) | `npm run typecheck:test` | ✅ PASS | tsc 0 errors |
| Build | `npm run build` | ✅ PASS | `dist/extension.js` 40.4 KB · `dist/webview.js` 2.0 MB · `dist/mermaid.js` 7.5 MB |
| Unit | `npm test` → `test:unit` | ✅ PASS | **132 / 132** (0 fail) — was 129; **+3 added by QA** (§3) |
| Integration | `npm test` → `test:integration` | ✅ PASS | **39 / 39** (0 fail) |
| Ext-host | `npm run test:exthost` | ✅ PASS | **4 / 4** (0 fail) |

> Total automated: **175** (132 unit + 39 integration + 4 ext-host), 0 failures.
>
> Notes: esbuild writes its banner to stderr, which PowerShell surfaces as a
> cosmetic `NativeCommandError` line — every stage exited `0`. The host bundle
> grew **25.4 KB → 40.4 KB** (+~15 KB for `src/links/`), matching the handoff;
> the webview bundle is unchanged (entirely host-side, no protocol change).
>
> **Formatter drift watch (plan §8):** none this run — `prettier --check` was
> clean on the first pass and again after QA's test edits. No `lint:fix` needed.

---

## 2. Automated coverage assessment — pure modules

The two pure, mock-free modules are the testable core. Assessed each checklist
case as **covered (✅)** or **gap (✗ → closed)**.

### `parseWikiTargets` — [test/links/parseWikiTargets.test.ts](../../test/links/parseWikiTargets.test.ts)

| Required case | Status |
|---|---|
| `[[target]]` extraction + 0-based line | ✅ |
| `[[target\|alias]]` (uses target, not alias) | ✅ |
| `[[target#heading]]` (captures heading) | ✅ |
| `[[target#heading\|alias]]` | ✅ |
| Path-qualified target preserved verbatim (`[[docs/Guide]]`) | ✅ |
| Multiple links on one line, in order | ✅ |
| Reject nested brackets (`[[a]b]]`, `[[a[b]]`) | ✅ |
| Reject newline-spanning link | ✅ |
| Skip fenced code block (` ``` ` and `~~~`) | ✅ |
| Skip leading YAML front matter | ✅ |
| Skip inline code span (incl. resume-after + unterminated run) | ✅ |
| Drop same-doc `[[#heading]]` (no note target) + empty `[[]]` | ✅ |
| Not fooled by ordinary `[text](url)` | ✅ |

### `linkIndex` (resolver) — [test/links/linkIndex.test.ts](../../test/links/linkIndex.test.ts)

| Required case | Status |
|---|---|
| Case-insensitive basename match (both link & query side) | ✅ |
| Target written with `.md` extension | ✅ |
| Basename matches a note in any folder | ✅ |
| Ambiguous basename links **all** matches | ✅ |
| Path-qualified: relative-first resolution | ✅ |
| Path-qualified: fallback to basename when relative misses | ✅ |
| Path-qualified: same-folder | ✅ |
| **No** self-backlink | ✅ |
| Per-line dedupe (two links, same target, one line) | ✅ |
| Keep separate links on different lines | ✅ |
| Stable sort (source path, then line) | ✅ |
| `#heading` captured but file-level grouped | ✅ |
| Unmatched target ignored | ✅ |

**Verdict:** every checklist case is covered. Coverage is comprehensive (41
pre-existing pure tests). No checklist case was missing.

---

## 3. Tests added by QA (edge-path closure)

While every checklist case was covered, three real, in-scope behaviours had
**zero** coverage. QA added one pure test each (test-only; no application source
touched, consistent with QA's mandate):

1. **`parseWikiTargets` — CRLF line numbering.** The parser splits on
   `/\r\n|\r|\n/` and the handoff claims platform-independent line indices, but
   only `\n` was exercised. New: *"reports correct line numbers with CRLF line
   endings"* asserts the same `line: 2/3` result on `\r\n` input.
2. **`linkIndex` — `.markdown` extension.** `MD_EXTENSION` accepts `.md` **and**
   `.markdown`, but only `.md` was tested. New: *"resolves a bare basename to a
   .markdown note"* confirms `[[Guide]]` backlinks `Guide.markdown`.
3. **`linkIndex` — case-insensitive self-link guard.** The self-link check
   lower-cases both sides, but only an exact-case self-link was tested. New:
   *"does not self-backlink when the link case differs from the file name"*
   (`Notes.md` containing `[[notes]]`) confirms the guard, not just basename
   equality, suppresses the self-reference.

Result: unit suite **129 → 132**, all green; `lint` + `typecheck:test` clean.

---

## 4. View contribution + guardrails verification

**View contribution (plan §2–§3, §6):**
- ✅ `package.json` contributes `markstudio.backlinks` under
  `contributes.views.explorer` with **the same `when` clause as the Outline** —
  `activeCustomEditorId == 'markstudio.editor'`. Diff vs `main` is exactly the
  one 5-line view object; nothing else in the manifest changed.
- ✅ **No new setting** — no `markstudio.backlinks.*` configuration property
  (mirrors the Outline; Producer decision §4.3).
- ✅ **No new dependency** — `dependencies` / `devDependencies` untouched.
- ✅ **No protocol / message change** — host-side only; no host⇄webview message
  added (verified: nothing touched under `src/messaging/` or `src/webview/`).

**Architecture guardrails (plan §7):**
- ✅ **Entirely host-side**, mirroring the Outline (ADR-0014). New module
  `src/links/` only; `src/extension.ts` adds one `registerBacklinks(provider)`
  line in `context.subscriptions`. No webview recreation.
- ✅ **Non-blocking activation.** `registerBacklinks` calls `service.start()`,
  which creates the watcher synchronously then kicks off `scanWorkspace()` with
  `void` (not awaited). `findFiles` is read in `SCAN_BATCH_SIZE = 24` batches —
  no synchronous workspace walk on the activation path.
- ✅ **`FileSystemWatcher` + 250 ms debounce + incremental re-parse.**
  `createFileSystemWatcher("**/*.md")` wires create/change/delete;
  `REBUILD_DEBOUNCE_MS = 250` coalesces bursts via a single `setTimeout`;
  `onFileTouched` re-reads/re-parses **only** the changed file from the cached
  `Map<path, ParsedNote>` before the cheap reverse-index rebuild.
- ✅ **`parseWikiTargets` / `linkIndex` stay pure** — grep confirms neither
  imports `vscode`, `node:fs`, `require(`, or `markdown-it`. The I/O lives in
  `LinkIndexService`; the URI⇄path mapping is host-side glue.
- ✅ **Click-to-open uses `showTextDocument` with a `selection`** at the linking
  line, with `safeLine` clamped to `[0, lineCount-1]` (no out-of-range crash).
  The custom editor's `priority: "option"` means navigation opens the plain text
  editor, not the webview — correct for revealing a specific line.

---

## 5. Manual EDH (F5) checklist — OUTSTANDING (human spot-check)

Cannot be asserted under jsdom — the index relies on `workspace.findFiles`, a
`FileSystemWatcher`, and a native `TreeView`, none of which exist in the unit /
integration harness. Run once in an Extension Development Host on a **multi-file
workspace** (handoff §9). Each row is pass/fail:

- [ ] **Backlink appears.** Open note **B** that note **A** links via `[[B]]` →
  the `MarkStudio Backlinks` view lists **A** with the linking line + snippet.
- [ ] **Click opens at the line.** Clicking the backlink opens **A** in a text
  editor with the cursor/selection on the linking line.
- [ ] **Live create.** Create a new note linking **B** → the panel adds it
  (debounced) **without a manual refresh**.
- [ ] **Live change.** Edit **A** to add/remove a `[[B]]` → the panel updates.
- [ ] **Live delete.** Delete **A** → it disappears from B's backlinks.
- [ ] **Case-insensitive resolution.** `[[b]]` matches `B.md`.
- [ ] **Path-qualified resolution.** `[[sub/B]]` resolves relative-first.
- [ ] **Large-workspace responsiveness.** On hundreds/thousands of `.md` files,
  activation and typing stay responsive while the panel shows
  "Indexing workspace…" then fills in ("No backlinks to this note." when empty).
- [ ] **Empty / no-active-note state.** Message clears when no MarkStudio editor
  is active; "No backlinks…" shown only after indexing completes.
- [ ] **Theme matrix.** Tree labels, the `references` Codicon, and the snippet
  description read correctly in **dark**, **light**, and **high-contrast**.

> Recommendation: the Producer (or Ivy) runs this 10-row matrix once before/at
> merge. It is a spot-check, not a code gate.

---

## 6. Defects filed

**None.** No bugs found in automated verification or static review of the
T-4.1 surface. No GitHub Issues required for this sprint.

---

## 7. Acceptance checklist (plan §6) status

| DoD item | Status |
|---|---|
| `[[B]]` from A surfaces A in the Backlinks view | ⏳ Manual (§5) — code path verified |
| Clicking a backlink opens A at the linking line | ⏳ Manual (§5) — code path verified |
| Edit/create/delete updates the panel debounced, no manual refresh | ⏳ Manual (§5) — watcher + 250 ms debounce verified |
| Initial indexing async, non-blocking on large workspace | ✅ Verified (non-awaited batched scan) |
| Basename resolution case-insensitive; path-qualified resolves | ✅ Unit-covered |
| No webview recreation, no protocol change; native tree only | ✅ Verified |
| lint / typecheck / typecheck:test / build / test all green | ✅ Verified (§1) |
| New unit tests added | ✅ 41 + 3 QA = 44 pure tests |
| Docs updated; M4.1 → Done; QA sign-off present | ✅ This document |

---

## 8. Sign-off

**✅ PASS — WITH NOTES.** Automated DoD fully green (175 tests, 0 failures);
pure parser/resolver comprehensively covered; view contribution additive and
correct; all guardrails hold; no defects. The two notes — 3 QA-added regression
tests (must travel with the branch) and the outstanding manual EDH spot-check
(§5) — do not block. **Branch is ready for Producer merge to `main`** after the
§5 spot-check is signed (regular merge, never squash/rebase).

— Ivy (QA)
