#!/usr/bin/env bash
# install/git.sh — Linux/macOS git identity + ed25519 SSH key. Zero secrets.
#
# Uses the GitHub CLI (gh) when available: browser/device auth, identity read
# straight from the GitHub account. Falls back to plain git config + keygen
# (email prompt only) when gh is missing.
#
# Nothing secret is written to disk except the SSH key you generate yourself.
# No PATs in remotes, no `credential.helper store` of plaintext tokens.
#
#   ./install/git.sh            interactive
#
# Mirrors the old root git_setup.sh, minus the token flows and the manual
# "type your repo" step (origin is rewritten from the existing remote URL).

set -euo pipefail

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
note() { printf '    %s\n' "$*"; }

KEY="$HOME/.ssh/id_ed25519"
EMAIL=""

# ---------------------------------------------------------------------------
# 1. Authenticate + identity
# ---------------------------------------------------------------------------
if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    info "no active gh session — starting gh auth login"
    info "(browser/device flow; gh stores the token in its own encrypted store,"
    note " never in this repo, git config, or remote URLs)"
    gh auth login
    gh auth status
  fi

  # point git at gh for HTTPS credentials instead of a plaintext store
  gh auth setup-git

  LOGIN="$(gh api user --jq .login)"
  EMAIL="$(gh api user --jq .email)"
  if [ -z "$EMAIL" ] || [ "$EMAIL" = "null" ]; then
    ID="$(gh api user --jq .id)"
    EMAIL="${ID}+${LOGIN}@users.noreply.github.com"
    info "no public email on your GitHub account — using noreply address: $EMAIL"
  fi

  git config --global user.name "$LOGIN"
  git config --global user.email "$EMAIL"
  info "git identity: $LOGIN <$EMAIL>"
else
  warn_gh() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
  warn_gh "gh (GitHub CLI) not found — falling back to minimal git config + SSH key."
  warn_gh "Install gh later for tokenless HTTPS pushes (gh auth login)."
  while [ -z "$EMAIL" ]; do
    if ! read -rp "Email for git commits (and SSH key comment): " EMAIL; then
      echo "no input — aborting" >&2
      exit 1
    fi
  done
  NAME="${EMAIL%%@*}"
  git config --global user.name "$NAME"
  git config --global user.email "$EMAIL"
  note "git identity: $NAME <$EMAIL> (override with: git config --global user.name ...)"
fi

# ---------------------------------------------------------------------------
# 2. ed25519 SSH key
# ---------------------------------------------------------------------------
if [ ! -f "$KEY" ]; then
  info "no SSH key at $KEY — generating one"
  [ -d "$HOME/.ssh" ] || mkdir -m 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -C "$EMAIL" -f "$KEY"
else
  info "SSH key already present: $KEY"
fi

info "public key (add it at github.com/settings/ssh/new if you use SSH remotes):"
cat "$KEY.pub"

if command -v gh >/dev/null 2>&1; then
  read -rp "Upload this key to your GitHub account now? [y/N] " UP || true
  if [[ "$UP" =~ ^[yY] ]]; then
    gh ssh-key add "$KEY.pub" -t "$(hostname)-$(date +%Y-%m-%d)"
  fi
fi

# ---------------------------------------------------------------------------
# 3. Switch origin to SSH when it is an HTTPS GitHub URL
# ---------------------------------------------------------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  URL="$(git remote get-url origin 2>/dev/null || true)"
  case "$URL" in
    https://github.com/*)
      REPO_PATH="${URL#https://github.com/}"
      REPO_PATH="${REPO_PATH%.git}"
      read -rp "Switch origin to git@github.com:${REPO_PATH}.git ? [y/N] " ANS || true
      if [[ "$ANS" =~ ^[yY] ]]; then
        git remote set-url origin "git@github.com:${REPO_PATH}.git"
        info "origin switched to SSH"
      fi
      ;;
    git@github.com:*) info "origin already uses SSH" ;;
  esac
else
  note "not inside a git repo — nothing to switch (gh auth handles HTTPS remotes anyway)"
fi

info "done. Zero-secrets reminder: no token ever lands in a remote URL,"
note "credential helper, or this repo. gh holds your auth; SSH keys are yours."
