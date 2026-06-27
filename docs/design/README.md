# Design Notes

> Pre-implementation design sketches for MarkStudio features and subsystems.

This directory holds the **Design** output of the workflow loop ([.ai/WORKFLOW.md](../../.ai/WORKFLOW.md) §2.2): how a change will work *before* it is built. A design note typically captures:

* The data flow (extension host ⇄ webview messages).
* The files to be created or modified.
* The public API surface added (functions, types, commands).
* State that must be persisted via `vscode.setState()` or a Memento.
* Open questions and trade-offs.

## Conventions

* One file per design topic, named in `kebab-case`: e.g. `split-view.md`, `scroll-sync.md`.
* A design note is a working document. Once a feature ships, promote the durable record to [../implementation/](../implementation/) using [.ai/TEMPLATES/FEATURE.md](../../.ai/TEMPLATES/FEATURE.md); the design note may then be trimmed or archived.
* Decisions that emerge from a design go into [../DECISIONS.md](../DECISIONS.md) as ADRs.

## Relationship to other docs

* **design/** — *how we plan to build it* (this directory)
* **[implementation/](../implementation/)** — *what was built and why* (durable record)
* **[../DECISIONS.md](../DECISIONS.md)** — *the decision* (ADR)
* **[../api/](../api/)** — *the resulting contracts* (messages, types, commands)

No design notes exist yet — the first will accompany Phase 1 work ([../TODO.md](../TODO.md)).
