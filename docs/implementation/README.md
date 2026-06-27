# Implementation Records

> Durable, per-feature records of *what was built and why*.

This directory holds one document per non-trivial feature, created from [.ai/TEMPLATES/FEATURE.md](../../.ai/TEMPLATES/FEATURE.md). Each record complements:

* the **ADR** in [../DECISIONS.md](../DECISIONS.md) (which records *the decision*), and
* the entry in [../CHANGELOG.md](../CHANGELOG.md) (which records *the change*).

An implementation record captures the feature's UX spec, architecture (components, data flow, message types, persisted state), performance budget and measured numbers, compliance check against the non-negotiable rules, test strategy, risks, and definition of done.

## Conventions

* One file per feature, named in `kebab-case` matching the feature slug: e.g. `live-preview.md`, `split-view.md`.
* Status moves through `Designing` → `Implementing` → `Shipped` (recorded in the file's metadata).
* For small features, a section in [../FEATURES.md](../FEATURES.md) is enough — use a full record only when the feature has its own design surface (data flow, message types, persisted state, performance budget).

## When to add one

Create an implementation record when starting any feature with its own message types, persisted state, or performance budget — typically every Phase 1 milestone in [../ROADMAP.md](../ROADMAP.md).

No records exist yet — the first will accompany Phase 1 work ([../TODO.md](../TODO.md)).
