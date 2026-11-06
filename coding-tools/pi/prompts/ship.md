---
description: Verify, commit, push, and open a PR
argument-hint: "[PR context]"
---
Ship the current work end to end. $@

1. Detect the project's checks from package.json / Makefile / pyproject.toml / Cargo.toml and run lint, typecheck, and tests. Fix what you broke; report pre-existing failures instead of hiding them.
2. Commit using the /commit rules: conventional message, no attribution.
3. Push the current branch, setting upstream if needed.
4. If `gh` is available, open a PR against the default branch: what changed, why, how it was verified, and risks. Reuse an existing PR for the branch.
5. Stop and ask before force-pushing, rewriting history, or pushing to the default branch.

Finish with the PR URL and one line of status.
