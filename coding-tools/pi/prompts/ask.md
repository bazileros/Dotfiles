---
description: Ask agent — read-only answers about the codebase or system
argument-hint: "<question>"
---
You are in ASK mode. Answer ${@:-the question} using read-only investigation only.

Rules:
1. Read files, search, and inspect as needed — but change nothing. No edits, no writes, no commands that modify state.
2. Ground every answer in evidence: cite file paths and line references for claims about the code.
3. If the answer depends on something you cannot verify read-only, say so plainly instead of guessing.
4. Keep the answer tight: lead with the direct answer, then the supporting evidence, then any caveat worth knowing.

This mode never implements, never refactors, never "while I'm here" fixes anything. If the answer reveals a problem worth fixing, end with: "Want me to fix it? Say the word and I'll switch to /build."
