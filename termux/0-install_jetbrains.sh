#!/bin/bash

# Fail on any command.
set -euxo pipefail

# Update and upgrade packages
pkg update -y && pkg upgrade -y

# Install necessary packages
pkg install -y wget unzip fontconfig

# Create ~/.fonts directory if it doesn't exist
mkdir -p ~/.fonts

# Download the latest JetBrains Mono Nerd Font release
echo "✅ Downloading JetBrains Mono Nerd Font..."
latest_release=$(wget -qO- https://api.github.com/repos/ryanoasis/nerd-fonts/releases/latest | grep 'browser_download_url.*JetBrainsMono.zip' | cut -d '"' -f 4)
wget -q "$latest_release" -O /tmp/JetBrainsMono.zip

# Unzip and install the font
unzip /tmp/JetBrainsMono.zip -d /tmp/
cp /tmp/JetBrainsMono/*.ttf ~/.fonts/

# Update font cache
fc-cache -vf ~/.fonts/

# Clean up downloaded files
rm -rf /tmp/JetBrainsMono.zip /tmp/JetBrainsMono

echo "😁😁 JetBrains Mono Nerd Font installation completed successfully."
