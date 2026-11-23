# Working agreement

## Defaults
- Read before you edit. Never guess at file contents, APIs, or command output.
- Match the codebase's existing style, structure, and error handling.
- Smallest correct diff. No drive-by refactors, renames, or reformatting.
- Ask before adding a dependency, changing a public API, or deleting files you did not create.
- Prefer `rg` and targeted reads over dumping whole files into context.

## Verify
- Run the project's real checks: lint, typecheck, tests. Report the exact commands and results.
- New behavior gets a test. A bug fix gets a regression test.
- Never claim something works without evidence. Say "unverified" when you did not run it.

## Tasks
- If `.beads/` exists, track work in beads: `bd ready` to find work, claim with `bd update <id> --claim`, close with `bd close <id> --reason "..."`. Do not keep a parallel todo list.
- Without beads, state a short plan in your reply and update it as you go.

## Delegation
- Use the `subagent` tool for independent parallel work and for recon that would flood context.
- Keep each task narrow, self-contained, and verifiable. A subagent does not see this conversation.
- Do not delegate what you can finish in one or two tool calls.

## Browser
- Browser work goes through Ghostex: the `mcp__ghostex_browser__*` tools or `ghostex browser open <url>`.
- Never launch Chrome, Playwright, or Puppeteer directly.

## Git
- Conventional Commits: `type(scope): summary`, 72 characters max.
- No attribution trailers (`Generated with`, `Co-authored-by`).
- Never force-push, rewrite shared history, or commit to the default branch without asking.

## Communication
- Lead with the answer. No preamble, no restating the question.
- Cite `path:line` and show the command output that proves the claim.
- Keep replies short; expand only when the detail changes a decision.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
