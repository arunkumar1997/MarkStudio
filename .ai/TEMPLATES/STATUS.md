# PROJECT STATUS — <YYYY-MM-DD>

> Copy this template into docs/PROJECT_STATUS.md and **overwrite** it at the end of every working session. History lives in git.

---

## 1. Snapshot

* **Current phase:** *(Phase 1 / 2 / 3 / 4 / 5 / 6 — see [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md) Long-Term Roadmap)*
* **Current milestone:**
* **Overall completion (qualitative):** *(e.g., "Phase 1: ~40%")*
* **Last updated:** YYYY-MM-DD by *(agent / author)*
* **Last commit on `main`:**

---

## 2. Current Focus

What the project is actively working on right now.

* **Active initiative:**
* **Owner (current agent):**
* **Started:** YYYY-MM-DD
* **Target outcome:**

If no initiative is active, write `No active initiative. See docs/TODO.md for the next item.`

---

## 3. Completed Features

User-visible features that are shipped and stable.

| Feature | Phase | Shipped in |
| ------- | ----- | ---------- |
|         |       |            |

For details, see docs/FEATURES.md.

---

## 4. In Progress

Work that is started but not shipped.

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
|      |       |       |       |

---

## 5. Blockers

Anything stopping progress.

* **Blocker:**
  * **Impact:**
  * **What is needed to unblock:**

If none, write `None.`

---

## 6. Known Issues

Bugs and limitations that users may hit.

| Issue | Severity | Workaround | Tracked in |
| ----- | -------- | ---------- | ---------- |
|       |          |            |            |

---

## 7. Technical Debt

Summary of debt items. Detail lives in docs/AGENT_HANDOFF.md and inline `TODO` comments.

*
*

---

## 8. Health Checks

Snapshot of the project's engineering health.

* [ ] Build is green
* [ ] Tests are green
* [ ] No unresolved high-severity issues
* [ ] Documentation is current with the code
* [ ] Last handoff is fresh (≤ last working session)
* [ ] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

Bullet list of what shipped in the most recent working session. Mirror the **What Was Completed** section of docs/AGENT_HANDOFF.md so this file is self-contained.

*
*

---

## 10. Recommended Next Task

The single most important next action. Should match docs/AGENT_HANDOFF.md Section 10.

* **Task:**
* **Why this one:**
* **Suggested prompt:** [.ai/PROMPTS/<feature|bugfix|refactor|architecture|review>.md](../PROMPTS/)

---

## 11. Links

* Vision: [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md)
* Philosophy: [.ai/CONTEXT.md](../CONTEXT.md)
* Workflow: [.ai/WORKFLOW.md](../WORKFLOW.md)
* Architecture: docs/ARCHITECTURE.md
* Decisions: docs/DECISIONS.md
* Roadmap: docs/ROADMAP.md
* Features: docs/FEATURES.md
* TODO: docs/TODO.md
* Changelog: docs/CHANGELOG.md
* Handoff: docs/AGENT_HANDOFF.md
