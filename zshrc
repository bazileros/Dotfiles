# Dotfiles/zshrc — ~/.zshrc template (lean, no oh-my-zsh)
#   ln -s ~/projects/Dotfiles/zshrc ~/.zshrc
# Keep this file syntactically bash-parseable (validation runs `bash -n`).

# --- Where this repo lives --------------------------------------------------
: "${DOTFILES:=$HOME/projects/Dotfiles}"

# --- Editor -----------------------------------------------------------------
export EDITOR=nvim
export VISUAL="$EDITOR"

# plugins=(
#   git
#   zsh-syntax-highlighting
#   zsh-autosuggestions
# )
# --- History ----------------------------------------------------------------
HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=10000
setopt extended_history     # timestamps in history
setopt hist_ignore_all_dups # drop older duplicates when a command is re-entered
setopt share_history        # share history across sessions

# --- Shell behaviour ----------------------------------------------------------
setopt autocd               # type a directory name to cd into it
bindkey -e                  # emacs keybindings (default, explicit)

# --- Completion (zsh native, no framework) -------------------------------------
autoload -Uz compinit && compinit

# Match the old oh-my-zsh tab behaviour: complete mid-word, cycle through
# matches on repeated tab, select from the menu with the arrow keys.
setopt complete_in_word
setopt always_to_end
setopt auto_menu
zstyle ':completion:*' menu select

# --- Zsh plugins (vendored from .oh-my-zsh/custom/plugins, no oh-my-zsh) ---------
# Syntax highlighting must load last (before the prompt is fine; it rebinds ZLE).
[ -f "$DOTFILES/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh" ] && \
  source "$DOTFILES/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh"
[ -f "$DOTFILES/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" ] && \
  source "$DOTFILES/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

# --- bun ------------------------------------------------------------------------
[[ -d "$HOME/.bun/bin" ]] && export PATH="$HOME/.bun/bin:$PATH"

# --- Shared aliases (bash + zsh) --------------------------------------------------
source "$DOTFILES/aliases/aliases.sh"

# --- Prompt (Oh My Posh) ----------------------------------------------------------------
# Cross-shell theme (zsh/bash/PowerShell all render oh-my-posh/theme.jsonc).
# Guarded so shells without the binary still work. Bash-parseable on purpose.
if command -v oh-my-posh >/dev/null 2>&1; then
  eval "$(oh-my-posh init zsh --config "$DOTFILES/oh-my-posh/theme.jsonc")"
fi

# --- Blank line between command output and the prompt (visual separation) ------------------
autoload -Uz add-zsh-hook
_zsh_blank_line() { print "" }
add-zsh-hook precmd _zsh_blank_line

# --- Startup info (fastfetch) -------------------------------------------------------------
# Interactive shells only; skipped when fastfetch isn't installed.
if [[ $- == *i* ]] && command -v fastfetch >/dev/null 2>&1; then
  fastfetch
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

[[ "$TERM_PROGRAM" == "kiro" ]] && . "$(kiro --locate-shell-integration-path zsh)"
export PATH="$PATH:$HOME/dart/flutter/bin"

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# opencode
export PATH=$HOME/.opencode/bin:$PATH