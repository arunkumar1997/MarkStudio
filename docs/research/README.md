# Research

> Investigations and findings that inform MarkStudio's design before a direction is committed.

This directory holds the **Research** output of the workflow loop ([.ai/WORKFLOW.md](../../.ai/WORKFLOW.md) §2.1): what already exists, what the relevant APIs allow, and what constraints shape a decision. Research notes feed into [../design/](../design/) sketches and [../DECISIONS.md](../DECISIONS.md) ADRs.

## What belongs here

* API investigations: VS Code Custom Editor API, webview CSP, `asWebviewUri`, Memento, file watching.
* CodeMirror 6 studies: extensions, transactions, theming via CSS variables, large-document behavior.
* markdown-it studies: plugin model, incremental rendering strategies, GFM/footnotes/containers.
* Performance experiments and benchmarks (e.g., preview patching strategies on large files).
* Comparative notes on prior art (Obsidian, Typora, GitHub Markdown) — for inspiration, never for copying UI.

## Conventions

* One file per investigation, `kebab-case`: e.g. `incremental-preview-strategies.md`, `cm6-theming.md`.
* State the question, the findings, and the recommendation. Link sources.
* A research note that produces a decision should reference (and be referenced by) the resulting ADR in [../DECISIONS.md](../DECISIONS.md).

No research notes exist yet — they will be added as Phase 1 questions arise ([../TODO.md](../TODO.md)).
