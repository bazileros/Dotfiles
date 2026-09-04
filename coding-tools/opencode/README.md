# opencode — global config

`opencode.json` here is symlinked to `~/.config/opencode/opencode.json` (file
link only — install/bootstrap). The rest of the global config directory stays
machine-local: opencode and its plugins write runtime state there (`skills/`,
`.oh-my-opencode-slim/` manifest, `node_modules`, `.ponytail-active`) which
must never land in the git repo.

## Policies

- **Zero secrets.** No API keys or tokens are ever stored in this repo.
  Secrets are referenced with `{env:VAR_NAME}` placeholders and resolved from
  the environment at runtime (e.g. `PAYSTACK_TEST_SECRET_KEY`).
- **Plugin installs are not synced.** npm/bun plugin dependencies are
  installed by opencode into `~/.cache/opencode` (outside this repo).
- Project-specific config (overrides, project MCPs, local plugins such as
  graphify) lives in each project's own `opencode.jsonc` / `.opencode/`,
  never here.

## Layout

- `opencode.json` — global config: model, shell, plugins, shared MCP servers
  (better-t-stack, context7, cloudflare-docs, shadcn, better-auth, convex,
  paystack).
- Skills live in `~/.agents/skills` and `~/.claude/skills`, fetched by
  `install/fetch.sh` via the skills.sh registry (`npx skills`).
