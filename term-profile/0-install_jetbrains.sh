#!/bin/bash

# Color definitions
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Fail on any command.
set -euxo pipefail

# Function to log messages
log() {
  local message="$1"
  local color="$2"
  echo -e "${color}${message}${RESET}"
}

# Update and upgrade packages
log "✅ Updating package lists..." "$GREEN"
apt update -y && apt upgrade -y

# Install necessary packages
log "✅ Installing wget, unzip, and lsd..." "$GREEN"
apt install -y wget unzip lsd

# Create ~/.fonts directory if it doesn't exist
log "✅ Creating fonts directory..." "$GREEN"
mkdir -p ~/.fonts

# Download the latest JetBrains Mono Nerd Font release
log "✅ Downloading JetBrains Mono Nerd Font..." "$GREEN"
latest_release=$(wget -qO- https://api.github.com/repos/ryanoasis/nerd-fonts/releases/latest | grep 'browser_download_url.*JetBrainsMono.zip' | cut -d '"' -f 4)

# Check if the download URL was found
if [ -z "$latest_release" ]; then
  log "❌ Error: Unable to find download URL for JetBrains Mono Nerd Font." "$RED"
  exit 1
fi

# Download the font zip file to a temporary location
temp_zip="$HOME/JetBrainsMono.zip"
wget -q "$latest_release" -O "$temp_zip"

# Check if the download was successful
if [ ! -f "$temp_zip" ]; then
  log "❌ Error: Font download failed." "$RED"
  exit 1
fi

# Unzip and install the font
log "✅ Installing the font..." "$GREEN"
unzip -o "$temp_zip" -d "$HOME/.fonts/"
rm "$temp_zip" # Clean up the zip file

log '📭 Moving JetBrainsMonoNLNerdFont-ExtraBold.ttf to ~/.termux as font.ttf' "$GREEN"
cp ~/.fonts/JetBrainsMonoNLNerdFont-ExtraBold.ttf ~/.termux/font.ttf

# Update font cache (check if fc-cache exists)
if command -v fc-cache &>/dev/null; then
  log "✅ Updating font cache..." "$GREEN"
  fc-cache -vf ~/.fonts/
else
  log "❌ Error: fc-cache command not found. Ensure fontconfig is installed correctly." "$RED"
  exit 1
fi

log "😁😁 JetBrains Mono Nerd Font installation completed successfully." "$GREEN"
