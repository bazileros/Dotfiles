#!/usr/bin/env bash
# fetch.sh — download third-party dotfiles content into the repo tree.
#
# The repo hosts only what we author. Everything else is fetched here so we
# don't maintain upstream code:
#
#   shell/zsh/plugins/*        zsh-users plugins, pinned to release tags
#   .agents/skills + .claude   agent skills via the skills.sh CLI
#                              (npx skills), restored from skills-lock.json
#                              which IS the committed manifest
#   ai-tools/skills/alchemy-cloudflare  vendored exception: not on the
#                              skills.sh registry, no official SKILL.md,
#                              derived from alchemy.run docs
#
# Idempotent: existing content is skipped. --dry-run prints what would run.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

say()  { printf 'fetch: %s\n' "$*"; }
run()  { if [ "$DRY" -eq 1 ]; then printf '  would run: %s\n' "$*"; else "$@"; fi; }

fetch_repo() { # dir url ref
  local dest="$REPO/$1"
  if [ -n "$(ls -A "$dest" 2>/dev/null)" ]; then
    printf '  %s already present, skipping\n' "$1"
    return
  fi
  if [ "$DRY" -eq 1 ]; then
    printf '  would clone %s (%s) -> %s\n' "$2" "$3" "$1"
  else
    mkdir -p "$(dirname "$dest")"
    git clone --quiet --depth 1 --single-branch --branch "$3" "$2" "$dest"
    printf '  cloned %s @ %s\n' "$1" "$3"
  fi
}

say "zsh plugins (pinned tags)"
fetch_repo shell/zsh/plugins/zsh-autosuggestions \
  https://github.com/zsh-users/zsh-autosuggestions v0.7.1
fetch_repo shell/zsh/plugins/zsh-syntax-highlighting \
  https://github.com/zsh-users/zsh-syntax-highlighting 0.8.0

say "agent skills (skills.sh CLI)"
if ! command -v npx >/dev/null 2>&1; then
  printf '  npx not found, skipping agent skills (needs node)\n'
else
  if [ -f "$REPO/skills-lock.json" ]; then
    printf '  skills-lock.json present, restoring pinned set\n'
    run npx -y skills experimental_install -y
  else
    printf '  no skills-lock.json, installing from upstream sources\n'
    run npx -y skills add \
      get-convex/agent-skills       waynesutton/convexskills \
      vercel-labs/agent-skills      vercel-labs/skills \
      anthropics/skills             leonxlnx/taste-skill \
      emilkowalski/skills           mattpocock/skills \
      better-auth/skills            effect-ts/skills \
      yusukebe/hono-skill           shadcn/ui \
      vercel/turborepo              tanstack-skills/tanstack-skills \
      deckardger/tanstack-agent-skills flutter/agent-plugins \
      stephen-golban/orpc-fullstack vcode-sh/vibe-tools \
      claude-office-skills/skills   graphify-labs/graphify \
      github/awesome-copilot        refoundai/lenny-skills \
      davila7/claude-code-templates mikecann/agent-skills \
      alvinunreal/oh-my-opencode-slim haowjy/creative-writing-skills \
      ulpi-io/skills                ariadoss/superskills \
      juandelossantos/another-agent-skills alexasomba/paystack-node \
      -y
    printf '  done — commit skills-lock.json to pin this set\n'
  fi

  if [ -d "$REPO/ai-tools/skills/alchemy-cloudflare" ] \
     && [ ! -d "$REPO/.agents/skills/alchemy-cloudflare" ]; then
    printf '  copying vendored alchemy-cloudflare into .agents/skills/\n'
    run cp -r "$REPO/ai-tools/skills/alchemy-cloudflare" \
      "$REPO/.agents/skills/alchemy-cloudflare"
  fi

  # Machine wiring: Claude Code reads skills from ~/.claude/skills. Point it
  # at the fetched tree (bootstrap used to do this for the vendored copies).
  if [ -d "$REPO/.claude/skills" ]; then
    if [ -L "$HOME/.claude/skills" ]; then
      printf '  ~/.claude/skills -> fetched tree\n'
      run ln -sfn "$REPO/.claude/skills" "$HOME/.claude/skills"
    elif [ -d "$HOME/.claude/skills" ]; then
      printf '  ~/.claude/skills is a real directory — leaving it alone\n'
    else
      printf '  linking ~/.claude/skills -> fetched tree\n'
      run ln -sfn "$REPO/.claude/skills" "$HOME/.claude/skills"
    fi
  fi
fi