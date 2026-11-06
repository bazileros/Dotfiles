# pi-todo

Persistent per-project todo tracker with a live TUI widget for [Pi](https://github.com/nicobailon/pi-coding-agent).

## What It Does

- Registers a `todo` tool the LLM can call to manage a task list
- Stores tasks in `.pi/todo.json` in the project root (per-project, persistent)
- Shows a **live widget** above the editor with the current todo state
- Auto-loads existing todos on session start

## Installation

Add the extension path to `~/.pi/agent/settings.json`:

```json
{
  "extensions": ["~/.pi/agent/extensions/todo/src/index.ts"]
}
```

Or if you already have extensions:

```json
{
  "extensions": ["~/.pi/agent/extensions/todo/src/index.ts", "other/extension/path"]
}
```

Then restart Pi (or run `/reload`).

## Tool: `todo`

### Actions

| Action | Required Fields | Description |
|--------|----------------|-------------|
| `add` | `text` | Create a new todo item |
| `update` | `id` | Modify an item's text/status/priority/assignee/blockedBy |
| `toggle` | `id` | Cycle status: pending → in-progress → done → pending |
| `remove` | `id` | Delete an item |
| `list` | — | List all items (optional: `filter`) |
| `clear` | — | Remove all completed items |
| `reorder` | `id`, `direction` | Move an item up or down in the list |

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `string` | yes | One of: add, update, toggle, remove, list, clear, reorder |
| `id` | `string` | conditional | Task ID (e.g. T-001) |
| `text` | `string` | conditional | Task description |
| `status` | `string` | no | pending, in-progress, done, blocked |
| `priority` | `string` | no | low, medium, high, critical (default: medium) |
| `assignee` | `string` | no | Who's doing it |
| `filter` | `string` | no | Filter for list: all, pending, in-progress, done, blocked |
| `blockedBy` | `string` | no | Task ID this is blocked by |
| `direction` | `string` | no | Reorder direction: up or down |

### Examples

```
todo({ action: "add", text: "Build StorefrontController", priority: "high", assignee: "Ultron" })
todo({ action: "toggle", id: "T-001" })
todo({ action: "list", filter: "pending" })
todo({ action: "reorder", id: "T-003", direction: "up" })
todo({ action: "clear" })
```

## Slash Commands

- `/todo` — List all todo items
- `/todo clear` — Clear completed items

## Storage

Tasks are stored in `.pi/todo.json` in the project root:

```json
{
  "items": [
    {
      "id": "T-001",
      "text": "Build StorefrontController",
      "status": "in-progress",
      "priority": "high",
      "assignee": "Ultron",
      "createdAt": "2026-07-05T19:02:00Z",
      "updatedAt": "2026-07-05T19:02:00Z",
      "blockedBy": null
    }
  ],
  "counter": 1
}
```

## Widget

The live widget appears above the editor with a green border and shows:

```
┌──────────────────────────────────────────────────┐
│ TODO · 3 tasks                                    │
│   2 pending · 1 active                            │
│   [ ] T-001 [HIGH] Build StorefrontController · Ultron │
│   [ ] T-002 [MED]  Port landing.html · Maya       │
│   [•] T-003 [LOW]  Verify storefront routes · Quinn │
└──────────────────────────────────────────────────┘
```

Status icons: `[ ]` pending, `[•]` in-progress, `[x]` done, `[!]` blocked

## Changelog

### v1.2.0

- **ASCII status icons** — Replaced emoji status icons with ASCII equivalents (`[ ]`, `[•]`, `[x]`, `[!]`) for universal terminal compatibility and cleaner rendering.
- Removed clipboard emoji from widget header.

### v1.1.0

- **Bordered widget** — The live widget now renders inside a green Unicode box border (uses `theme.fg("success")`) for better visual separation from the chat area.

### v1.0.0

- Initial release: todo tool, live widget, slash commands, per-project persistence.

## Design Decisions

- **Per-project, not global** — Each project has its own todo list
- **Main agent only** — Subagents cannot call the todo tool
- **Auto-generated IDs** — T-001, T-002, T-003...
- **Synchronous file I/O** — Avoids race conditions (Node single-threaded)
- **No external dependencies** — Uses only Pi's built-in typebox
