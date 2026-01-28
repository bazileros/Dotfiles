#!/bin/bash

GREEN="\033[0;32m"
RESET="\033[0m"

log() {
    echo -e "${GREEN}$1${RESET}"
}

read -p "Enter your GitHub username: " github_username
read -p "Enter your email address: " user_email

log "Setting global Git identity..."
git config --global user.name "$github_username"
git config --global user.email "$user_email"

# Ensure SSH key exists
if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
    log "No SSH key found. Generating one..."
    ssh-keygen -t ed25519 -C "$user_email"
fi

log "Your public SSH key (add this to GitHub):"
echo
cat ~/.ssh/id_ed25519.pub
echo

read -p "Enter repo in form username/repo.git: " repo

log "Switching remote to SSH..."
git remote set-url origin "git@github.com:$repo"

log "Done. You can now git push without tokens 🎉"
