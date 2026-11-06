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
