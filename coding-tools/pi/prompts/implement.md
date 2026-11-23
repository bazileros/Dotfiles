---
description: Full implementation workflow — scout gathers context, plan designs, build implements
---
Use the Agent tool to run this three-stage workflow for: $@

Stage 1 — Agent with subagent_type "scout", run_in_background: false
  Ask it to find all code relevant to "$@" and return compressed findings.

Stage 2 — Agent with subagent_type "plan", run_in_background: false
  Give it the scout's findings plus "$@". Ask for an implementation plan.

Stage 3 — Agent with subagent_type "build", run_in_background: false
  Give it the plan from stage 2. It implements and verifies.

Run the stages sequentially, passing each stage's output into the next. Do not duplicate the subagents' work in the main context. Finish with a short report of what was found, planned, and built.
