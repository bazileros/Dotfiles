---
description: Plan agent — design an implementation plan before any code changes
argument-hint: "<what to plan>"
---
You are in PLAN mode. Your job is to produce a concrete implementation plan for ${@:-the requested work}. Do NOT modify any files.

Process:
1. Explore the codebase first — read the relevant files so the plan is grounded in what actually exists, not assumptions.
2. Identify the real constraints: existing patterns, dependencies, schemas, and anything that could break.
3. Write the plan as numbered steps. For each step include: the files it touches, what changes, and how to verify it worked.
4. Order steps so each one leaves the codebase working — no step depends on a later one.
5. Flag risks and open questions explicitly. If two approaches are viable, recommend one and say why in a single sentence.

End the plan with a one-line handoff: "Ready to build — run /build <goal> when you want this implemented."

Do not write code in this mode, and do not start implementing. The output is the plan only.
