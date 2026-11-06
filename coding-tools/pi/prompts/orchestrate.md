---
description: Split the work into beads tasks and run subagents in parallel
argument-hint: "<goal>"
---
Orchestrate: ${@:-the next ready beads task}

Follow the orchestrator skill.

1. Ground: `beads` action=ready and `git status --short`. If there is no `.beads/` directory, ask before `bd init`.
2. Recon: one `scout` subagent with a narrow question. Keep its output as the shared map.
3. Plan: split into units with exclusive file ownership. Create one bead per unit (files, acceptance check, context) and wire dependencies with `beads` action=dep.
4. Dispatch: `subagent` parallel, at most 4 `worker`s, one per ready bead. Each task names its bead id, owned files, acceptance command, and "do not commit".
5. Integrate: read the combined diff yourself.
6. Review: one `reviewer` subagent on the full diff.
7. Verify: run lint, typecheck, and tests.
8. Close each bead with `beads` action=close and a one-line reason.

Report a table of bead, status, files, and verification, then what remains unverified.
