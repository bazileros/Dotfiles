# aliases/aliases.sh — shared shell aliases for bash AND zsh
#
# Single source of truth: alias syntax is identical in bash and zsh.
# Sourced by Dotfiles/zshrc (~/.zshrc) and Dotfiles/bashrc (~/.bashrc).
# Rules: plain `alias name='command'` only — no `alias -g`, no zsh-only flags.

# Where this repo lives. Override DOTFILES in your shell rc before sourcing.
: "${DOTFILES:=$HOME/projects/Dotfiles}"

# ---------------------------------------------------------------------------
# Core: navigation & ls
# ---------------------------------------------------------------------------
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias l='ls -l'
alias la='ls -la'
alias ll='ls -lah'

# ls → lsd (user's pick). Fall back to colored ls when lsd is missing.
if command -v lsd >/dev/null 2>&1; then
  alias ls='lsd'
else
  case "$(uname -s)" in
    Darwin*) alias ls='ls -G' ;;
    *)       alias ls='ls --color=auto' ;;
  esac
fi
alias c='clear && fastfetch'

# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------
alias gt='git status'
alias ga='git add'
alias gaa='git add .'
alias gc='git clone'
alias gcom='git commit'
alias gcm='git commit -m'
alias gp='git push'
alias gl='git pull'
alias gco='git checkout'
alias gb='git branch'
alias glg='git log --oneline --graph'
alias glog='git log'
alias gd='git diff'
alias gf='git fetch'
alias grh='git reset --hard'
alias gclean='git clean -fd'

# ---------------------------------------------------------------------------
# bun (package manager)
# ---------------------------------------------------------------------------
alias b='bun'
alias bd='bun dev'
alias ba='bun add'
alias bad='bun add -d'
alias br='bun run'
alias bi='bun install'
alias bx='bunx'

# ---------------------------------------------------------------------------
# Turborepo (monorepo tasks; bunx resolves the local turbo binary)
# ---------------------------------------------------------------------------
alias turbo='bunx turbo'
alias tdev='bunx turbo run dev'
alias tbuild='bunx turbo run build'
alias ttype='bunx turbo run check-types'
alias tlin='bunx turbo run lint'

# ---------------------------------------------------------------------------
# Convex (backend)
# ---------------------------------------------------------------------------
alias cdev='bunx convex dev'
alias cdeploy='bunx convex deploy'
alias cdash='bunx convex dashboard'

# ---------------------------------------------------------------------------
# Alchemy / Effect (infra)
# ---------------------------------------------------------------------------
alias adev='bunx alchemy dev'
alias adeploy='bunx alchemy deploy'

# ---------------------------------------------------------------------------
# Editor
# ---------------------------------------------------------------------------
alias v='nvim'
alias vi='nvim'
alias vim='nvim'
alias t='nvim'

# ---------------------------------------------------------------------------
# GitHub CLI
# ---------------------------------------------------------------------------
alias pr='gh pr create'

# ---------------------------------------------------------------------------
# System / everyday
# ---------------------------------------------------------------------------
alias mkdir='mkdir -p'
alias cp='cp -i'
alias mv='mv -i'
alias dfh='df -h'
alias duh='du -sh'
alias pj='cd ~/projects && ls'
alias szsh='source "$DOTFILES/zshrc"'

# `open` exists natively on macOS; fall back to xdg-open on Linux
if ! command -v open >/dev/null 2>&1 && command -v xdg-open >/dev/null 2>&1; then
  alias open='xdg-open'
fi

# ---------------------------------------------------------------------------
# Dotfiles
# ---------------------------------------------------------------------------
alias dotf='cd "$DOTFILES"'
alias dotsync='git -C "$DOTFILES" pull'