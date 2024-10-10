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

# Prompt for user information
read -p "Enter your GitHub username: " github_username
read -p "Enter your email address: " user_email
read -sp "Enter your GitHub Personal Access Token: " github_token
echo

# Set global Git configuration
log "✅ Setting up Git configuration..." "$GREEN"
git config --global user.name "$github_username"
git config --global user.email "$user_email"
git config --global credential.helper store

# Set remote URL with username (replace 'username/repo.git' with your actual repo)
read -p "Enter the repository URL (e.g., username/repo.git): " repo_url
git remote set-url origin https://"$github_username":"$github_token"@github.com/"$repo_url"

log "✅ Git configuration completed successfully!" "$GREEN"
log "🔄 You will be prompted for your token the first time you push." "$GREEN"
log "🔄 Subsequent pushes will use the stored username." "$GREEN"
