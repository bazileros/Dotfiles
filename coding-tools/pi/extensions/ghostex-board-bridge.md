# ghostex-board-bridge

Makes a pi session aware of the Ghostex Project Board bead it is working, so task identity and
acceptance criteria survive compaction and resume.

## Files

| Path | Role |
| --- | --- |
| `extensions/ghostex-board-bridge.ts` | Extension: identity resolution, prompt injection, `bead` tool |
| `extensions/ghostex-board-bridge/pure.ts` | Pure helpers (no I/O). Subdirectory has no `index.ts`, so pi never loads it |
| `tests/ghostex-board-bridge.test.ts` | `bun test ~/.pi/agent/tests` |

## Operation

Identity resolves at session start, first hit wins, and never invents an id:

1. a persisted `ghostex-board-bridge` session entry (survives resume and compaction)
2. `ghostex state` → `beadConversationLinks` matching `PI_SESSION_ID` / `PI_SESSION_FILE`
3. the dispatched prompt: `Work on bead <id>` (verified against a real worker session)
4. nothing found → the model is told to ask; project work must not start

The resolved `Task <id> · status · acceptance criteria` line is appended to the prompt as a
guideline on every turn, so compaction cannot drop it by construction.

## `bead` tool

| op | command | guard |
| --- | --- | --- |
| `show` | `bd show <id> --json` | refreshes cached title/status/AC |
| `comments` | `bd comments <id> --json` | bead must exist |
| `children` | `bd children <id> --json` | bead must exist |
| `comment` | `bd comment <id> <text>` | adds the `Agent:`/`Session:` trailer |
| `status` | `bd update <id> --status <s>` | rejects statuses outside the board's set |
| `create` | `bd create … [--parent <id>]` | parent must exist first |
| `close` | `bd close <id>` | refuses a dirty working tree unless `allowDirty: true` |
| `associate` | `gx board associate <id>` | needs `GHOSTEX_GLOBAL_SESSION_REF` |

## Configuration

None required. Behaviour is driven by the environment Ghostex already exports
(`PI_SESSION_ID`, `PI_SESSION_FILE`, `GHOSTEX_GLOBAL_SESSION_REF`) and by `bd`/`gx` on `PATH`.

- The `bead` tool is allowed by default in
  `~/.pi/agent/extensions/pi-permission-system/config.json` (`"bead": "allow"`), otherwise each
  call would prompt.
- `bd *`, `gx board *`, `ghostex state`, `git status` and `git diff` are allowed there too;
  everything else still asks.

## Limitations

- No board (`.beads` missing) or no `bd` on `PATH` → every op returns
  `No Beads board here` and nothing else happens.
- The `ghostex state` link shape is undocumented and may change across Ghostex upgrades; it is
  only layer 2, so layers 1 and 3 keep working.
- One `bd` call per op. Two concurrent `bd` processes can hit an embedded-Dolt lock; the error is
  surfaced verbatim rather than retried.
- `close` cannot know whether the acceptance criteria were actually verified. It only enforces the
  parts it can observe: the bead exists and the tree is clean.

## Recovery

| Symptom | Do this |
| --- | --- |
| Guideline says no bead is established | say which card it is; then `bead({op:"show", id:"<id>"})` |
| Wrong bead injected | `bead({op:"clear"})`, then `bead({op:"show", id:"<right-id>"})` |
| `bead … failed: bd … database is locked` | wait a second, retry once; do not run parallel `bd` calls |
| Close refused over uncommitted work | commit or ask the user to, record why in a `comment`, then retry with `allowDirty: true` |
| Identity lost after fork/restore | `gx board associate <id>` from the new session |
| Tool missing entirely | check `ls ~/.pi/agent/extensions/` and that pi starts without extension errors |
