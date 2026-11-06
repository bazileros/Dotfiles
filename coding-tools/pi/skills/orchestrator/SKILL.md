---
name: orchestrator
description: Split multi-part work into beads tasks and run subagents in parallel, then integrate and verify. Use when a request spans several files or independent workstreams, when asked to "orchestrate", "split this up", "run agents in parallel", or when a bead has several ready children.
---

# Orchestrator

You are the coordinator. You keep your own context small and spend subagent context on reading and implementing.

## Decide first
Orchestrate when the work has **3+ independent units**, or when recon would flood your context.
Do **not** orchestrate a single-file fix, a one-command check, or anything you can finish in two tool calls. Do it directly.

## The loop

### 0. Ground
- `beads` action=ready to see claimable work; `git status --short` to see the tree.
- If the repo has no `.beads/` directory, ask before running `bd init`. Without beads, keep the task list in your reply and continue.

### 1. Recon
Run one `scout` subagent with a narrow question ("how does auth middleware work, which files own it, how is it tested"). Use its output as the shared map for every worker. Do not re-read the whole repo yourself.

### 2. Plan
Split the goal into units with **exclusive file ownership**. For each unit create a bead:

```
beads action=create
  title: "<imperative unit>"
  description: "Files: <exact paths>. Acceptance: <test or command>. Context: <what the worker needs from recon>."
  priority: 1 for blocking/risky work, 2 default
  type: task | bug | feature
```

Serialize shared files with `beads` action=dep (`id` depends on `blockedBy`). Never let two parallel workers own the same file.

### 3. Dispatch
Use the `subagent` tool in parallel mode, at most **4** at a time, one `worker` per ready bead. Every task string must contain:

- the bead id and title
- the files it owns (exclusive)
- the acceptance check, as an exact command
- the worker report format
- "do not touch other files; do not commit or change git state"

Small tasks can share a worker; large ones should not.

### 4. Integrate
Read the combined diff yourself (`git diff`). Resolve overlaps and ordering. Do not accept "done" without the acceptance command's output.

### 5. Review
Run one `reviewer` subagent on the full diff with the goal and the acceptance criteria. Fix blockers before reporting.

### 6. Verify
Run the project's real checks (lint, typecheck, tests). Send failures back to the owning worker with the exact error, or fix them yourself if they are small.

### 7. Close
`beads` action=close with a one-line reason per bead. Report:

| bead | status | files | verification |
|---|---|---|---|

Then one paragraph: what shipped, what is unverified, what is next.

## Rules
- Delegate reading, keep decisions.
- If a subagent fails, read its output before retrying; never blind-respawn.
- Browser verification goes to the `browser-tester` agent, which uses the Ghostex browser tools.
- Close beads even when a unit is abandoned: `close` with reason "dropped: <why>".
