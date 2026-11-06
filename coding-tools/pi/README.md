# pi — coding agent config

Everything here is symlinked into `~/.pi/agent/` by `install/bootstrap`, entry by
entry. The whole dir is deliberately **not** linked: pi writes credentials,
caches, session logs and machine paths into that directory, and none of it may
land in this repo.

| Path here                   | Linked to                          | What it is                              |
|-----------------------------|------------------------------------|-----------------------------------------|
| `settings.json`             | `~/.pi/agent/settings.json`        | provider/model, thinking level, theme, `packages`, default tools |
| `AGENTS.md`                 | `~/.pi/agent/AGENTS.md`            | working agreement injected into every session |
| `keybindings.json`          | `~/.pi/agent/keybindings.json`     | session key rebinds                     |
| `mcp.json`                  | `~/.pi/agent/mcp.json`             | MCP servers (ghostex-browser, exa)      |
| `agents/`                   | `~/.pi/agent/agents/`              | subagent definitions                    |
| `prompts/`                  | `~/.pi/agent/prompts/`             | slash-command prompt templates          |
| `skills/<name>/`            | `~/.pi/agent/skills/<name>/`       | locally authored skills (per dir, so fetched skills can coexist) |
| `themes/one-dark.json`      | `~/.pi/agent/themes/one-dark.json` | colorscheme matching the kitty palette  |
| `extensions/`               | `~/.pi/agent/extensions/`          | extensions + `lib/` + `subagent/`       |
| `vendor/pi-todo/`           | `~/.pi/agent/vendor/pi-todo/`      | vendored todo package (no upstream sync) |

## What is never synced

`auth.json`, `mcp-auth.json`, `models-store.json`, `sessions/`, `trust.json`,
`zar-rate.json`, `npm/` (pi's managed package install) and
`extensions/node_modules/` stay machine-local. `.gitignore` covers the one that
would otherwise appear here: `coding-tools/pi/extensions/node_modules/`.

## After linking

```sh
npm ci --prefix coding-tools/pi/extensions   # playwright-core for webtest.ts
```

`install/setup` runs this as the "pi extensions dependencies" step. The
extensions in `settings.json`'s `packages` array (`npm:pi-lens`,
`npm:pi-questions`, `vendor/pi-todo`) are installed by pi itself into
`~/.pi/agent/npm` on first start — nothing to sync.

## Notes

- **`settings.json` is written by pi.** It adds `lastChangelogVersion` and
  `extensionChangelogVersions` on updates, so the symlinked file will show small
  diffs after a pi upgrade. Those keys are intentionally not committed.
- **Secrets stay out.** `auth.json`/`mcp-auth.json` hold provider and MCP
  credentials; ghostex secrets are requested at runtime via `ghostex secret
  request`. Never paste a token into a file here.
- **Paths are `$HOME`-relative.** Extensions must not embed absolute home
  paths; `extensions/ghostex-session.ts` builds the notify-hook path from
  `os.homedir()`.
- **The pi binary itself is not managed here** — install it separately; this
  repo only reproduces its configuration.
