---
description: Review current changes like a staff engineer
argument-hint: "[focus area]"
---
Review the uncommitted changes in this repository. $@

Method:
1. `git status --short`, `git diff HEAD`, and `git diff --cached` to see everything.
2. Read enough surrounding code to judge each hunk in context. Never review a diff in isolation.
3. For each finding: severity (blocker / important / nit), `path:line`, why it matters, and the concrete fix.

Look for, in order:
- Logic errors, off-by-one, wrong operator, unreachable branches
- Unhandled errors, swallowed exceptions, missing awaits
- Injection, path traversal, secret leakage, unsafe deserialization
- Races, unbounded growth, N+1 queries
- Missing or wrong tests for the changed behavior

Output: one line on what the change does, then findings ordered by severity. No praise. If nothing is wrong, say so and name what you verified.
