# Internal API Reference

> The contracts that hold MarkStudio together: the host ⇄ webview message protocol, shared types, commands, configuration keys, and persisted-state shapes.

This directory documents MarkStudio's **internal** API surface — the seams that contributors must keep stable and in sync with the code. It is not (yet) a public plugin API; a public Plugin/Theme API is a Phase 6 concern ([../ROADMAP.md](../ROADMAP.md)).

## What lives here

| Topic | Description | Source of truth (once implemented) |
| ----- | ----------- | ---------------------------------- |
| Message protocol | The typed discriminated union exchanged over the MessageBus (`init`, `setContent`, `edit`, `ready`, `configChanged`, …) | `src/messaging/messages.ts` |
| Shared types | Types crossing the host ⇄ webview boundary | `src/messaging/` |
| Commands | Command IDs and their behavior (Open MarkStudio, Toggle Preview, …) | `package.json` contributes + `src/commands/` |
| Configuration | `markstudio.*` settings, defaults, and effects | `package.json` configuration contribution |
| Persisted state | Shapes stored via `vscode.setState()` and Mementos | `src/webview/state/`, `src/services/StateStore.ts` |

## Rules

* The **code is the source of truth**; docs here mirror it. When a message type, command, or setting changes, update both the code and the matching doc in the **same change**.
* Message payloads are plain JSON — never `vscode` objects, DOM nodes, or functions (see [../ARCHITECTURE.md](../ARCHITECTURE.md) §6).
* Adding or changing a message/command/setting follows the workflow loop and may require an ADR in [../DECISIONS.md](../DECISIONS.md).

## Conventions

* One file per area, `kebab-case`: e.g. `message-protocol.md`, `commands.md`, `configuration.md`.

The contracts will be documented here as Phase 1 implements them ([../TODO.md](../TODO.md) T-103 onward). A draft message set is sketched in [../ARCHITECTURE.md](../ARCHITECTURE.md) §6.
