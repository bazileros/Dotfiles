# Dotfiles/bashrc — ~/.bashrc template
#   ln -s ~/projects/Dotfiles/bashrc ~/.bashrc

# Interactive shells only (bash sources this for non-interactive shells too).
case $- in
  *i*) ;;
    *) return ;;
esac

# Where this repo lives
: "${DOTFILES:=$HOME/projects/Dotfiles}"

# Shared aliases (same file as zsh)
[ -f "$DOTFILES/aliases/aliases.sh" ] && source "$DOTFILES/aliases/aliases.sh"

# --- Prompt (Oh My Posh) ------------------------------------------------------------
# Cross-shell theme, same file as zsh/PowerShell. This file is interactive-only
# (guard at the top), so no extra $- check is needed here.
command -v oh-my-posh >/dev/null 2>&1 && eval "$(oh-my-posh init bash --config "$DOTFILES/oh-my-posh/theme.jsonc")"

# Blank line between command output and the prompt (visual separation)
# Appends to omp's PROMPT_COMMAND array; runs before PS1 is printed.
PROMPT_COMMAND+=('printf "\n"')

# --- Startup info (fastfetch) ---------------------------------------------------------
command -v fastfetch >/dev/null 2>&1 && fastfetch