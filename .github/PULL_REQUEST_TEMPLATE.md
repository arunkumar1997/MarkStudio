<!--
MarkStudio pull request. Keep PRs small and mapped to a single task.
See docs/CONTRIBUTING.md §7 before opening.
-->

## Summary

<!-- What does this change do, and why? One short paragraph. -->

## Linked task

<!-- The TODO ID or handoff item this implements, e.g. T-104. PRs must map to a task. -->

- Task: T-

## Type of change

- [ ] feat — new user-facing capability
- [ ] fix — bug fix
- [ ] perf — performance, no behavior change
- [ ] docs — documentation only
- [ ] refactor — no behavior change
- [ ] build / chore — tooling, dependencies

## Non-negotiable checklist

> The full list is in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md). Confirm none are violated.

- [ ] No UI or CSS framework introduced
- [ ] `webview.html` assigned once; webview/editor/preview not recreated
- [ ] No hardcoded colors, fonts, or sizes (uses `--vscode-*` variables)
- [ ] Any new dependency has an ADR in [docs/DECISIONS.md](../docs/DECISIONS.md)

## Definition of Done

> See [.ai/START_HERE.md](../.ai/START_HERE.md) §6.

- [ ] Compiles under strict TypeScript; tests pass
- [ ] Verified in dark, light, and high-contrast themes (if UI-facing)
- [ ] Docs updated in this PR: `CHANGELOG`, `PROJECT_STATUS`, `TODO`, `AGENT_HANDOFF` (+ `ARCHITECTURE`/`DECISIONS`/`FEATURES` if applicable)

## Assumptions / technical debt

<!-- Mirror anything recorded in the handoff. -->
