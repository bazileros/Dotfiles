---
description: Multi-agent orchestration — plan designs, build implements, reviewer verifies (isolated agents)
---
Use the Agent tool to run this three-stage orchestration for: $@

Stage 1 — Agent with subagent_type "plan", run_in_background: false
  Ask it for an implementation plan for "$@". Capture the plan it returns.

Stage 2 — Agent with subagent_type "build", run_in_background: false
  Give it the plan from stage 1 verbatim, plus the original goal "$@". It implements and verifies.

Stage 3 — Agent with subagent_type "reviewer", run_in_background: false
  Give it the build agent's report (what changed, which files, what was verified). Ask it to review the actual diff.

Run the stages sequentially — each needs the previous stage's output. Do not run them in parallel, and do not do the work yourself in the main context.

Finish with a report: what the plan called for, what got built and verified, and the reviewer's verdict (including any issues worth fixing).
