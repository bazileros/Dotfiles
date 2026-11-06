---
description: Reproduce and fix a bug at the root cause
argument-hint: "<symptom, error, or failing test>"
---
Debug: ${@:-the current failure}

1. Reproduce it deterministically. Show the exact command and output.
2. Narrow it with evidence, not guesses: add a failing test or logging, trace the code path, check recent changes with `git log -p`.
3. State the root cause in one sentence before changing anything.
4. Fix the cause, not the symptom. Keep the diff minimal.
5. Add a regression test that fails without the fix.
6. Run the relevant suite and report results.

If you cannot reproduce it, list what you ruled out and what you need.
