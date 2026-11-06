---
description: Commit the current work with a conventional message
argument-hint: "[scope or extra context]"
---
Commit the current changes. $@

1. Inspect `git status --short` and `git diff HEAD` (plus `git diff --cached`).
2. Group related changes. If the diff contains unrelated work, commit only the coherent part and say what you left out.
3. Write a Conventional Commit: `type(scope): imperative summary`, 72 characters max. Types: feat, fix, refactor, perf, test, docs, build, ci, chore. Add a body only to explain *why*, wrapped at 72.
4. Never add "Generated with", "Co-authored-by", or any tool attribution.
5. Commit, then show `git log -1 --stat`.
