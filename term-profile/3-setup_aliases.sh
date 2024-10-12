#!/bin/bash

# Color definitions for logging
GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

# Function to log messages
log() {
  local message="$1"
  local color="$2"
  echo -e "${color}${message}${RESET}"
}

# Define the aliases file path
ALIAS_FILE="$HOME/.oh-my-zsh/custom/aliases.zsh"

# Create the aliases file if it doesn't exist
if [ ! -f "$ALIAS_FILE" ]; then
  log "✅ Creating aliases file at $ALIAS_FILE..." "$GREEN"
  touch "$ALIAS_FILE"
else
  log "✅ Found existing aliases file at $ALIAS_FILE." "$GREEN"
fi

# Prompt user for aliases
while true; do
  read -p "Enter an alias (or type 'exit' to finish): " alias_input

  # Exit condition
  if [ "$alias_input" == "exit" ]; then
    log "🚪 Exiting alias setup." "$GREEN"
    break
  fi

  # Append the alias to the aliases file
  echo "$alias_input" >>"$ALIAS_FILE"
  log "✅ Added alias: $alias_input" "$GREEN"
done

# Inform user to source their .zshrc to apply changes
log "🔄 Don't forget to source your .zshrc file to apply changes!" "$GREEN"
log "Run: source ~/.zshrc" "$GREEN"
