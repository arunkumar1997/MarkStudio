# QA Sign-off — Sprint 3 / T-4.1b (In-preview wiki-link navigation)

> QA: **Ivy**. Date: 2026-06-27. Branch under test: `feature/sprint-3` (PR #1, NOT merged).
> Scope: clicking a rendered wiki-link (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`)
> in the live preview resolves via the shared M4.1 host resolver and opens the
> target note (at the `#heading` line when present). New typed `openWikiLink`
> webview→host message; one delegated click listener; one hoisted
> `LinkIndexService`. Acceptance checklist: [docs/sprint-3/plan.md](../sprint-3/plan.md) §6.

---

## Verdict: ✅ PASS — WITH NOTES

The automated Definition of Done is fully green (**201 tests, 0 failures**; lint,
both typechecks, and build clean). The implementation matches the plan exactly:
the click is **delegated** (one listener on the persistent preview root, render
path untouched), the new `openWikiLink` message is **boundary-guarded**,
resolution **reuses the M4.1 resolver** through a single hoisted
`LinkIndexService` (no second scan, no parallel logic), and heading navigation
reuses the host heading scanner. Every matrix row was verified by tracing the
code path end-to-end plus the automated tests that pin each seam.

Two notes gate a clean close — **neither is a blocker**:

1. **One minor defect filed** — [#2](https://github.com/arunkumar1997/MarkStudio/issues/2):
   a target that *resolves but fails to open* (e.g. deleted within the 250 ms
   watcher-debounce window) throws an **unhandled rejection** with no user
   feedback, instead of the graceful status-bar fallback the DoD requires. Narrow
   race, no host crash, happy path unaffected → **minor**, not a blocker.
2. **Live EDH (F5) matrix is outstanding** — the actual editor open, cursor
   reveal, and theme rendering cannot be driven in this non-interactive (no-GUI)
   environment. Reduced to a short scripted checklist in §5; it is a spot-check,
   not a code gate.

**No application source was modified by QA** (consistent with the QA mandate).
The branch is **ready for Producer merge to `main`** once the §5 spot-check is
signed (regular `--no-ff` merge, never squash/rebase per plan §8). Issue #2 may
be fixed before merge or tracked as a fast-follow at the Producer's discretion.

---

## Re-verification (2026-06-30, post-#2-fix)

Dev (Sage) fixed defect [#2](https://github.com/arunkumar1997/MarkStudio/issues/2)
on `feature/sprint-3` in commit `51aea4f`. Ivy re-verified by code review +
full automated re-run.

**Code review of `openWikiLink`** ([src/editor/MarkStudioEditorProvider.ts](../../src/editor/MarkStudioEditorProvider.ts)) — confirmed:

- ✅ The open/reveal block (`openTextDocument` → `findHeadingLine` →
  `showTextDocument`) is now wrapped in a single `try { … }`.
- ✅ The `catch` path posts the same transient
  `vscode.window.setStatusBarMessage("MarkStudio: could not open note for [[…]]", 4000)`
  fallback as the unresolved path and `return`s — **no throw, no modal**.
- ✅ The unresolved early-return (`matches.length === 0` → status-bar →
  `return`) is **unchanged**; the resolver call (`linkIndexService.resolveTarget`),
  the `openWikiLink` message protocol, and the method signature
  (`fromUri`, `target`, `heading`) are **untouched**.
- ✅ `safeLine` clamp to `[0, lineCount-1]` is preserved.
- ✅ The doc-comment's “This method never throws” claim is now **genuinely
  accurate** — both the unresolved and resolved-but-unopenable paths degrade to
  the same transient status-bar message; the only `await`s that could reject are
  inside the `try`.

No regression test was added — the private `vscode`-glue method isn't reachable
from the unit/exthost seams without a disproportionate mock surface (documented
in §3). Verdict: **#2 is resolved at the code level.** The live
“delete `B.md` mid-debounce → status-bar fallback, no error” reproduction is a
human EDH row (§5) Ivy cannot execute, so #2 is **code-verified but
manually-unconfirmed** pending that one spot-check.

**Automated re-run (`feature/sprint-3` @ `51aea4f`), all green:**

| Stage | Command | Result | Count |
|---|---|---|---|
| Lint + format | `npm run lint` | ✅ PASS | eslint 0 warnings · prettier all-clean |
| Typecheck (src) | `npm run typecheck` | ✅ PASS | tsc 0 errors |
| Typecheck (test) | `npm run typecheck:test` | ✅ PASS | tsc 0 errors |
| Build | `npm run build` | ✅ PASS | extension + webview + mermaid bundled |
| Unit | `npm test` → `test:unit` | ✅ PASS | **152 / 152** (0 fail) |
| Integration | `npm test` → `test:integration` | ✅ PASS | **45 / 45** (0 fail) |
| Ext-host | `npm run test:exthost` | ✅ PASS | **4 / 4** (0 fail) |

> Total automated: **201** (152 + 45 + 4), 0 failures — unchanged from the
> original sign-off (the fix is a host-glue `try/catch`, not reachable by the
> suite). **No prettier drift; no application source modified by QA.**

---

## 1. Pipeline results (local, `feature/sprint-3`)

| Stage | Command | Result | Count |
|---|---|---|---|
| Lint + format | `npm run lint` | ✅ PASS | eslint 0 warnings (`--max-warnings 0`) · prettier all-clean |
| Typecheck (test) | `npm test` → `typecheck:test` | ✅ PASS | tsc 0 errors |
| Unit | `npm run test:unit` | ✅ PASS | **152 / 152** (0 fail) |
| Integration | `npm run test:integration` | ✅ PASS | **45 / 45** (0 fail) |
| Ext-host | `npm run test:exthost` | ✅ PASS | **4 / 4** (0 fail) |

> Total automated: **201** (152 unit + 45 integration + 4 ext-host), 0 failures.
>
> Counts match the dev handoff exactly (unit 132 → 152, integration 39 → 45,
> exthost 4). esbuild writes its banner to stderr (cosmetic PowerShell
> `NativeCommandError`) — every stage exited `0`. No formatter drift this run.

---

## 2. Static / code-review assessment — implementation vs plan

Reviewed every touched file against the plan's architecture table (§3) and
guardrails (§7). All hold:

- ✅ **Delegated click, render path untouched.** `wikiLinkClick.ts` mounts **one**
  `click` listener on `previewRoot` using `Element.closest('a.markstudio-wikilink')`;
  no per-anchor listeners, no change to `PreviewRenderer`. Bound once to the
  persistent pane (ADR-0002), so it survives every incremental patch.
- ✅ **Empty target inert.** A `[[#heading]]` link (empty `data-wikilink-target`)
  returns early — no message posted (integration-tested).
- ✅ **Boundary-guarded message.** `openWikiLink` is in the `WebviewToHostMessage`
  union; the guard accepts `{ target: string, heading: string|null }` and rejects
  missing/non-string `target` and non-(string|null) `heading` (unit-tested, §3).
- ✅ **One shared resolver, no duplication.** `LinkIndex.resolveForward` is a thin
  public wrapper over the same private `resolveTarget` the backlink build uses;
  `LinkIndexService.resolveTarget` maps path→URI. Panel and click-nav agree by
  construction. Forward resolution intentionally **keeps** the self-match
  (`[[A]]` in A opens A); the backlink loop still drops self — verified distinct
  and correct.
- ✅ **One hoisted `LinkIndexService`.** `extension.ts` creates it, calls
  `start()`, injects it into `register()` **and** `registerBacklinks(provider, service)`,
  and disposes via subscriptions. No second workspace scan; `resolveTarget` never
  re-scans (in-memory lookup).
- ✅ **Heading nav reuses the scanner.** `findHeadingLine` (added to
  `src/outline/headings.ts`, pure) matches the `data-wikilink-heading` text
  case-insensitively/trimmed against `parseHeadings` output; miss → `-1` → host
  falls back to line 0. The rendered `data-wikilink-heading` (raw heading text)
  and the matcher use the **same** text grain — seam is consistent.
- ✅ **Graceful unresolved.** No match → `window.setStatusBarMessage(…, 4000)`,
  no throw. `safeLine` is clamped to `[0, lineCount-1]`.
- ✅ **No new setting / dependency / pane / protocol-recreation.** Gated by the
  existing `markstudio.preview.wikiLinks` (off ⇒ no anchors render ⇒ nothing to
  click — inertly absent). `package.json` deps untouched.

---

## 3. Automated coverage assessment — new test blocks

| Module / seam | Test file | Cases | Status |
|---|---|---|---|
| `linkIndex.resolveForward` | [test/links/linkIndex.test.ts](../../test/links/linkIndex.test.ts) §"resolveForward (T-4.1b navigation)" | basename, case-insensitive, `.md` extension, **self-match kept**, ambiguous→all, path-qualified relative-first (incl. `../`), basename fallback, miss→`[]`, whitespace→`[]` | ✅ 9 |
| `findHeadingLine` | [test/outline/headings.test.ts](../../test/outline/headings.test.ts) §"findHeadingLine (T-4.1b navigation)" | exact match→line, case-insensitive+trimmed, first heading, miss→`-1`, blank→`-1`, fenced-`#` not matched | ✅ 6 |
| `openWikiLink` guard | [test/messaging/messages.test.ts](../../test/messaging/messages.test.ts) §"openWikiLink" | accept w/ heading, accept null heading, reject missing target, reject non-string heading, reject missing target | ✅ 5 |
| Click → message seam | [test/integration/wikiLinkClick.test.ts](../../test/integration/wikiLinkClick.test.ts) | posts target+null heading, carries heading, nested-element click via `closest`, `preventDefault`, ignores non-wiki anchor, inert empty-target | ✅ 6 |

**Verdict:** the four genuinely unit/integration-testable seams (forward
resolver, heading scan, message guard, click delegation) are well covered. No
coverage gap was found in the testable surface; QA added **no** new tests this
sprint (unlike Sprint 2 — the dev coverage was already complete).

> Note: the host `openWikiLink` method (`MarkStudioEditorProvider`) is `vscode`-API
> glue and is **not** unit-covered by design (exercised manually / exthost), which
> is exactly why defect #2 escaped the suite — see §5.

---

## 4. Matrix verification — by code path + automated proof

Each Phase-8 matrix row, with how it was verified short of a live EDH:

| Matrix row | Verified via | Result |
|---|---|---|
| Click `[[note]]` → opens note | integration (posts `openWikiLink`) + host path review + `resolveForward` unit | ✅ Code-verified |
| `[[note\|alias]]` resolves on target | render stamps `data-wikilink-target=`**target**; click reads target | ✅ Code-verified |
| `[[note#heading]]` reveals heading line | `data-wikilink-heading` carried (integration) + `findHeadingLine` unit + host reveal review | ✅ Code-verified |
| Ambiguous basename → opens first | `resolveForward` returns all (unit) + host opens `matches[0]` | ✅ Code-verified |
| Unresolved target → status-bar, no crash | `resolveForward`→`[]` (unit) + host `setStatusBarMessage` | ✅ Code-verified |
| Same-doc `[[#heading]]` → inert | empty-target early-return (integration) | ✅ Code-verified |
| Toggle `markstudio.preview.wikiLinks` off → links gone | T-3.4 behavior (rule not registered ⇒ literal text ⇒ no anchors) | ✅ Inherited |
| Light / dark / high-contrast | **no new CSS this sprint**; links inherit T-3.4 `--vscode-*` theming | ✅ Inherited |

> "Inherited" = behavior is wholly owned by the already-shipped, already-signed
> T-3.4 rendering and this sprint adds nothing to it.

---

## 5. Live EDH (F5) checklist — OUTSTANDING (human spot-check)

Cannot be asserted in this environment (no interactive GUI; the actual open,
cursor reveal, and theme rendering need a real Extension Development Host). Run
once on a **multi-file workspace**. Every row below is **human-only** — each
requires a person driving a live EDH (mouse click on a rendered preview link,
observing cursor reveal / theme rendering). A non-interactive agent **cannot**
tick any of these; they remain unchecked until a human runs them. Each row is
pass/fail:

- [ ] **(human EDH) Open by name.** In note A's preview, click `[[B]]` → **B** opens in a text editor.
- [ ] **(human EDH) Alias.** `[[B|see B]]` renders "see B" and still opens **B**.
- [ ] **(human EDH) Heading.** `[[B#Setup]]` opens **B** with the cursor on the `## Setup` line.
- [ ] **(human EDH) Heading miss.** `[[B#Nope]]` opens **B** at the top (line 0), no error.
- [ ] **(human EDH) Ambiguous.** Two `B.md` in different folders → clicking `[[B]]` opens one (first match), no crash.
- [ ] **(human EDH) Unresolved.** `[[DoesNotExist]]` → transient status-bar message "no note found", nothing opens, no error popup.
- [ ] **(human EDH) Same-doc heading.** `[[#Heading]]` in the preview does nothing (inert).
- [ ] **(human EDH) Toggle off.** Set `markstudio.preview.wikiLinks: false` → `[[B]]` renders as literal text and is not clickable.
- [ ] **(human EDH) Persistence.** After an edit/patch to the preview, a wiki-link clicked later still navigates (delegated listener survives).
- [ ] **(human EDH) Theme matrix.** Links read correctly in **dark**, **light**, **high-contrast** (no new styling, but confirm no regression).
- [ ] **(human EDH) Defect #2 repro — now the key gate.** Delete `B.md` then immediately click `[[B]]` (inside the ~250 ms watcher-debounce window) → confirm a transient status-bar message "could not open note for [[B]]" appears and **no error is thrown**. This is the live confirmation of the `51aea4f` fix; code-verified but **manually-unconfirmed** until this row passes ([#2](https://github.com/arunkumar1997/MarkStudio/issues/2)).

> Recommendation: the Producer (or Ivy) runs this once before/at merge. Spot-check, not a code gate.
> **None of these rows may be marked passed without a human driving the EDH.**

---

## 6. Defects filed

| # | Title | Severity | Status |
|---|---|---|---|
| [#2](https://github.com/arunkumar1997/MarkStudio/issues/2) | `openWikiLink`: resolved-but-unopenable target throws an unhandled rejection (no graceful fallback) | minor | **Fixed in `51aea4f` — code-verified; pending human EDH repro (§5)** |

One minor defect, now **code-fixed** (open/reveal path wrapped in `try/catch`,
degrades to the same transient status-bar fallback as the unresolved path — see
the Re-verification note). Closure pending the live §5 repro row a human must
run; QA recommends keeping the issue **open** until that spot-check passes. No
major or blocker defects found.

---

## 7. Acceptance checklist (plan §6) status

| DoD item | Status |
|---|---|
| Clicking `[[B]]` opens note B | ⏳ Manual (§5) — code path + integration verified |
| `[[B#Heading]]` reveals the heading line (fallback line 0) | ⏳ Manual (§5) — `findHeadingLine` unit-verified |
| `[[B\|alias]]` resolves on target B | ✅ Code-verified (render carries target) |
| Resolution relative to active note; matches the panel | ✅ Shared resolver (`resolveForward`), unit-verified |
| Unresolved degrades gracefully; ambiguous opens first | ✅ Resolver unit-verified · resolved-but-unopenable now degrades gracefully (#2 fixed `51aea4f`, code-verified · §5 human repro pending) |
| `openWikiLink` in the union **and** rejected when malformed | ✅ Unit-verified (guard) |
| Only one `LinkIndexService` (shared); no second scan | ✅ Verified (hoisted to `extension.ts`) |
| No webview recreation / new pane; single delegated listener | ✅ Verified |
| lint / typecheck:test / build / test all green; tests added | ✅ Verified (§1, §3) |
| Docs updated incl. `api/message-protocol.md`; T-4.1b → Done; QA sign-off | ✅ This document |

---

## 8. Sign-off

**✅ PASS — WITH NOTES.** Automated DoD fully green (**201 tests, 0 failures**;
lint + typechecks + build clean, re-confirmed 2026-06-30 @ `51aea4f`). The
implementation matches the plan and every guardrail holds; the four testable
seams are well covered; every matrix row is verified by code path + automated
proof. Defect [#2](https://github.com/arunkumar1997/MarkStudio/issues/2) (minor,
non-blocking) is **code-fixed** in `51aea4f` and code-verified by review — the
resolved-but-unopenable path now degrades to the same transient status-bar
fallback, and the “never throws” contract is genuine.

**The only remaining gate is the human §5 EDH spot-check** — in particular the
live “delete `B.md` mid-debounce” repro that confirms #2 in a real Extension
Development Host. Those rows require a human driving the GUI and **cannot** be
ticked by a non-interactive agent. **Branch `feature/sprint-3` (PR #1) is ready
for Producer merge to `main`** once that §5 spot-check is signed — regular
`--no-ff` merge, never squash/rebase (plan §8). No application source was
modified by QA.

— Ivy (QA)
