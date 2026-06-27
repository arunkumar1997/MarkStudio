# AGENT HANDOFF — <Session Title or Date>

> Copy this template into docs/AGENT_HANDOFF.md at the end of every working session. **Overwrite** the previous handoff; do not append. The previous handoff is preserved in git history.
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../START_HERE.md), and docs/PROJECT_STATUS.md.

---

## Session Metadata

* **Date:** YYYY-MM-DD
* **Agent / Author:**
* **Working branch:**
* **Last commit on this branch:**
* **Prompt used:** *(feature / bugfix / refactor / architecture / review)*

---

## 1. What Was Completed

Concrete, verifiable outcomes in this session.

*
*
*

For each item, link to the commit(s) when possible.

---

## 2. Current Work In Progress

Anything started but not finished. Be precise about state.

* **Item:**
  * **Current state:** *(branch, uncommitted changes, partial test coverage, etc.)*
  * **Why it stopped:** *(out of context, blocked, design question)*
  * **What it would take to finish:**

If nothing is in progress, write `None.`

---

## 3. Remaining Work for This Initiative

The next steps for whatever was being worked on, in order.

1.
2.
3.

If the initiative is complete, write `Initiative complete.` and point to the next item from docs/TODO.md.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
|      |        |       |

Include both code and documentation files.

---

## 5. Decisions Made

Brief log of decisions taken during the session.

* **Decision:** …
  * **Recorded as ADR?** Yes → ADR-NNNN / No → *(explain why not, or commit to adding one)*

If no decisions were made, write `None.`

---

## 6. Assumptions Made

Anything the spec did not specify and was decided on the fly.

*
*

Each assumption should either:

* be verified by the next agent, **or**
* be promoted into an ADR / spec update.

---

## 7. Technical Debt Introduced

Honest list of shortcuts, missing tests, deferred refactors, TODO comments left in code.

* **Debt:** …
  * **Location:** *(file:line)*
  * **Justification:**
  * **TODO item created in docs/TODO.md?** Yes / No

If none, write `None.`

---

## 8. Blockers

Anything preventing progress. Be specific enough that the next agent can act on it.

* **Blocker:**
  * **Impact:**
  * **What is needed to unblock:**

If none, write `None.`

---

## 9. Verification State

Snapshot of build / test / manual verification at the end of the session.

* [ ] `npm run build` passes
* [ ] `npm test` passes
* [ ] Manual verification done in dark theme
* [ ] Manual verification done in light theme
* [ ] Manual verification done in high-contrast theme
* [ ] Webview is not recreated on tab switch (verified)
* [ ] CodeMirror state preserved on tab switch (verified)
* [ ] Preview patches DOM (verified)

If any item is unchecked, explain in **Blockers** or **Technical Debt**.

---

## 10. Recommended Next Task

**Exactly one** clear next task for the next agent.

* **Task:**
* **Why this one:**
* **Suggested prompt:** [.ai/PROMPTS/<feature|bugfix|refactor|architecture|review>.md](../PROMPTS/)
* **Starting files to read:**
  *
  *
* **Definition of done for this task:**

---

## 11. Open Questions for the Next Agent

Questions you would have asked if there was time.

*
*

If none, write `None.`
