# RELEASE

> How MarkStudio is versioned, packaged, and published to the Visual Studio Marketplace. The release tooling does not exist yet (it lands with the extension scaffolding, T-101). This document defines the target process so releases are repeatable and auditable from day one.

---

## 1. Versioning

MarkStudio follows [Semantic Versioning](https://semver.org/):

* **MAJOR** — incompatible changes to user-facing behavior, settings, or the (future) plugin API.
* **MINOR** — backwards-compatible features.
* **PATCH** — backwards-compatible bug fixes.

Pre-1.0 caveat: while the editing core is being stabilized (Phases 1–2), the project stays on `0.x`. Under `0.x`, minor versions may include breaking changes; this is called out explicitly in [CHANGELOG.md](CHANGELOG.md). The first `1.0.0` ships only when the Phase 1 exit criteria in [ROADMAP.md](ROADMAP.md) are met and stable.

The version of record is the `version` field in `package.json`.

---

## 2. Release Cadence

* Releases are **cut from `main`** and are intentional, not automatic.
* Group changes into a release when a milestone ([ROADMAP.md](ROADMAP.md)) or a coherent set of features/fixes is complete.
* Security and high-severity bug fixes may be released as an out-of-band PATCH.

---

## 3. Pre-Release Checklist

Before tagging a release, confirm:

* [ ] `main` is green: `npm run build`, `npm run lint`, and `npm test` all pass.
* [ ] The Manual Verification Matrix in [TESTING.md](TESTING.md) §4 passes for changes in this release.
* [ ] [CHANGELOG.md](CHANGELOG.md) `Unreleased` section is complete and accurate.
* [ ] [PROJECT_STATUS.md](PROJECT_STATUS.md) reflects the released state.
* [ ] [AGENT_HANDOFF.md](AGENT_HANDOFF.md) is current.
* [ ] All ADRs for decisions in this release are recorded in [DECISIONS.md](DECISIONS.md).
* [ ] No new dependency lacks an ADR.
* [ ] `README` / marketplace copy is accurate for any new user-facing feature.

---

## 4. Release Steps

1. **Finalize the changelog.** Rename the `Unreleased` section in [CHANGELOG.md](CHANGELOG.md) to `## [x.y.z] - YYYY-MM-DD` and start a fresh, empty `Unreleased` section.
2. **Bump the version.** Update `version` in `package.json` (e.g., `npm version <patch|minor|major>` once tooling exists).
3. **Commit.** `chore(release): vX.Y.Z` including the changelog and version bump in the same commit.
4. **Tag.** Create an annotated git tag `vX.Y.Z` on the release commit.
5. **Package.** Build the VSIX with `vsce package` (produces `markstudio-X.Y.Z.vsix`).
6. **Smoke test the VSIX.** Install the packaged VSIX into a clean VS Code instance and verify activation, opening a `.md` file in MarkStudio, and the headline features of the release.
7. **Publish.** `vsce publish` to the Visual Studio Marketplace (and optionally `ovsx publish` to Open VSX).
8. **Create a GitHub Release.** Attach the VSIX and paste the changelog section as the release notes.
9. **Post-release docs.** Update [PROJECT_STATUS.md](PROJECT_STATUS.md) and rewrite [AGENT_HANDOFF.md](AGENT_HANDOFF.md) for the next cycle.

---

## 5. Packaging Notes

* `.vscodeignore` must exclude `docs/`, `.ai/`, tests, source maps, and build configuration so the published VSIX contains only the bundled extension and required assets.
* The webview script is bundled (per ADR-0006) and loaded under a strict CSP with a nonce; verify no unbundled/remote scripts ship.
* Codicons and any static CSS in `media/` are included and loaded via `asWebviewUri`.

---

## 6. Marketplace Metadata

`package.json` must carry accurate `displayName`, `description`, `categories`, `keywords`, `repository`, `icon`, and `galleryBanner` fields. Visual identity (icon, banner, marketplace copy) is tracked as `BRANDING.md` (task T-130) and should be finalized before the first public `1.0.0`.

---

## 7. Rollback

If a release is found to be broken:

1. Identify the last known-good version.
2. Publish a new PATCH that reverts the offending change (preferred over un-publishing).
3. Record the incident and root cause in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) and, if it stems from a decision, add a corrective ADR in [DECISIONS.md](DECISIONS.md).

Never rewrite a published tag; always move forward with a new version.
