# ADR-NNNN: <Short, Imperative Title>

> Architecture Decision Record. Copy this template to docs/DECISIONS.md (or docs/decisions/NNNN-title.md if using one file per ADR). Replace `NNNN` with the next sequential number.

---

## Status

`Proposed` | `Accepted` | `Superseded by ADR-XXXX` | `Deprecated`

## Date

YYYY-MM-DD

## Context

What is the situation that requires a decision? What forces are at play (technical, product, performance, dependency, team)?

Reference the trigger:

* Issue / PR / handoff item:
* Feature / refactor / architecture prompt that produced this ADR:
* Affected sections of [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md), [.ai/CONTEXT.md](../CONTEXT.md), or docs/ARCHITECTURE.md:

## Decision

State the decision in one or two clear, imperative sentences.

> *Example:* "We will use a single persistent webview per Custom Editor instance, retained with `retainContextWhenHidden: true`, and route all editor ↔ extension communication through a typed message bus."

## Alternatives Considered

For each alternative, briefly state what it was and why it was rejected.

1. **Alternative A** — *Rejected because…*
2. **Alternative B** — *Rejected because…*
3. **Alternative C** — *Rejected because…*

## Reasoning

Why this decision over the alternatives? Tie the reasoning back to:

* Non-Negotiable Rules in [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md)
* Core Beliefs in [.ai/CONTEXT.md](../CONTEXT.md)
* Performance, maintainability, accessibility, theme correctness
* Long-term roadmap implications

## Consequences

### Positive

*

### Negative / Trade-offs

*

### Neutral

*

## Compliance Impact

Does this decision change or bend any non-negotiable rule? If so, list which rule and how it is contained.

* Rule affected:
* Containment / scope of the exception:

If the answer is "no rule bent", say so explicitly.

## Migration Plan

If the decision changes existing behavior or structure, describe the migration:

1.
2.
3.

Include the rollback point for each step.

## Follow-Ups

* TODO items added to docs/TODO.md:
* Documents updated (docs/ARCHITECTURE.md, [.ai/CONTEXT.md](../CONTEXT.md), etc.):
* Tests added or modified:

## References

* Related ADRs:
* Related issues / PRs:
* External docs (VS Code API, CodeMirror, markdown-it, RFCs, etc.):
