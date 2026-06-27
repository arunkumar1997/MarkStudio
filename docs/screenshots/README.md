# Screenshots

> Visual references for MarkStudio features, documentation, and the marketplace listing.

This directory holds image assets referenced by the documentation and (eventually) the marketplace README. Screenshots are how we hold ourselves to the **Aesthetic Bar** in [.ai/CONTEXT.md](../../.ai/CONTEXT.md) §6: MarkStudio should be indistinguishable from a first-party VS Code editor.

## Conventions

* Group per feature in a subfolder named after the feature slug: `screenshots/<feature-slug>/`.
* Use descriptive `kebab-case` filenames including the theme where relevant: e.g. `split-view-dark.png`, `live-preview-light.png`, `outline-high-contrast.png`.
* Prefer PNG for UI screenshots.
* Capture the same view in **dark**, **light**, and **high-contrast** themes when a change affects appearance — this is part of verification ([../TESTING.md](../TESTING.md) §4).
* Keep images reasonably sized; avoid committing very large files.

## Usage

* Implementation records in [../implementation/](../implementation/) link their screenshots here (see [.ai/TEMPLATES/FEATURE.md](../../.ai/TEMPLATES/FEATURE.md) §3).
* The marketplace listing ([../RELEASE.md](../RELEASE.md)) draws its imagery from here.

No screenshots exist yet — they will be added as Phase 1 features become visible ([../TODO.md](../TODO.md)).
