---
description: Explain how a file, symbol, or subsystem works
argument-hint: "<path or symbol>"
---
Explain ${1:-the most important part of this codebase} to a senior engineer who is new to this repo.

- Start with one paragraph: purpose and where it sits in the architecture.
- Trace the real control flow from entry point to effect, naming files and functions.
- Call out invariants, tricky edge cases, and anything that looks wrong or surprising.
- End with the three files to read next and why.

Cite `path:line` for every claim. Use a diagram only when it beats prose.
