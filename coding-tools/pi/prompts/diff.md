---
description: Explain the working-tree diff by intent, with risks
argument-hint: "[path or focus]"
---
Explain the current diff. $@

1. `git diff --stat`, then `git diff` (add `--cached` for staged work).
2. Group the diff by intent, not by file. For each group: what changed, why, and what could break.
3. Flag only what matters: broken behavior, missed cases, security, data loss, performance cliffs, missing tests.
4. End with a numbered action list, highest risk first.

Cite `path:line` for every claim. Do not restate the diff line by line.
