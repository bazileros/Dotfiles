---
description: Show the ASCII cheatsheet for this pi setup (models, modes, agents, skills)
---
Print this cheatsheet exactly as written (it's a quick reference for the user), then stop:

```
╔══════════════════════════════════════════════════════════════╗
║                    ▞▚  P I  ·  CHEATSHEET                    ║
╚══════════════════════════════════════════════════════════════╝

  MODEL        deepseek-v4.1-flash  (opencode-go)
  THINKING     /thinking            → low · high · max  (Ctrl+S saves default)
  THEME        onedark              → /settings · /awesome shows this sheet

──────────────────  MODES (slash commands)  ────────────────────

  /plan <goal>          Design an implementation plan, no code changes
  /build <goal>         Implement end to end, verify before finishing
  /ask <question>       Read-only answers with file/line evidence
  /implement <goal>     Chain: scout → plan → build (isolated agents)
  /orchestrator <goal>  Chain: plan → build → reviewer (isolated agents)

──────────────────  AGENTS (spawn on demand)  ───────────────────

  Agent types (pi-subagents):  scout · plan · build · ask · reviewer · worker
  "Use scout to …"      Fast read-only recon, compressed handoff context
  "Use plan to …"       Implementation planning, never edits files
  "Use build to …"      Implements plans, verifies before finishing
  "Use ask to …"        Read-only Q&A with evidence
  "Use reviewer to …"   Senior code review (git diff, read-only)
  "Use worker to …"     General-purpose isolated worker
  Parallel:   ask for several Agent runs in one turn (they queue, 10 at a time)
  @mentions:  @scout also check the RPC path   ·  @main returns to the main model
  /agents     Fleet view: every running agent, live conversation, steer it inline

──────────────────  WEB  ───────────────────────────────────────

  web_search_exa        Exa search via MCP — no API key, clean results
  web_fetch_exa         Read any page as clean markdown
  (both are model tools; just ask "search the web for …")


──────────────────  SKILLS  ─────────────────────────────────────

  Auto-loads when a task matches a skill's description.
  Force one anytime:    /skill:<name>   (e.g. /skill:cua-driver)
  Add more:             drop a folder with SKILL.md into ~/.agents/skills/

──────────────────  EVERYDAY KEYS  ──────────────────────────────

  Ctrl+P    Cycle models            /model     Pick a specific model
  Ctrl+S    Save in dialogs         /settings  Theme, defaults, everything
  /reload   Reload after editing agents, prompts, themes, extensions

──────────────────  STATUS LINE  ───────────────────────────────

  Shows the active agent:  main · build · plan · ask · skill:<name>
  While delegating:        build → scout+ask   (agents in play)


```

After printing it, ask: "What are we building today?"
