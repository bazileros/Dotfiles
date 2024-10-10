#!/bin/bash

# Color definitions for logging
GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

# Function to check command success
check_success() {
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error occurred during the last command.${RESET}"
    exit 1
  fi
}

# Update and upgrade Termux packages
echo -e "${GREEN}✅ Updating package lists...${RESET}"
pkg update -y && pkg upgrade -y
check_success

# Install necessary packages including Python
echo -e "${GREEN}✅ Installing required packages...${RESET}"
pkg install wget openssl-tool proot neovim python -y
check_success

# Download and set up Ubuntu if not already installed
if [ ! -d "$HOME/ubuntu" ]; then
  echo -e "${GREEN}✅ Downloading Ubuntu setup script...${RESET}"
  wget https://raw.githubusercontent.com/EXALAB/AnLinux-Resources/master/Scripts/Installer/Ubuntu/ubuntu.sh
  check_success

  echo -e "${GREEN}✅ Setting up Ubuntu...${RESET}"
  bash ubuntu.sh
fi

# Start Ubuntu
echo -e "${GREEN}✅ Starting Ubuntu...${RESET}"
./start-ubuntu.sh

# Update Ubuntu packages and install additional tools
echo -e "${GREEN}✅ Updating Ubuntu packages...${RESET}"
apt update && apt upgrade -y && apt install vim wget python3 -y
check_success

# Download latest Code-Server release dynamically
echo -e "${GREEN}✅ Fetching the latest Code-Server release...${RESET}"
latest_code_server=$(wget -qO- https://api.github.com/repos/coder/code-server/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
check_success

echo -e "${GREEN}✅ Downloading Code-Server version ${latest_code_server:1}...${RESET}"
wget "https://github.com/coder/code-server/releases/download/${latest_code_server}/code-server-${latest_code_server:1}-linux-arm64.tar.gz"
check_success

# Extract Code-Server
echo -e "${GREEN}✅ Extracting Code-Server...${RESET}"
tar -xvf "code-server-${latest_code_server:1}-linux-arm64.tar.gz"
cd "code-server-${latest_code_server:1}-linux-arm64/bin" || {
  echo "Failed to enter directory"
  exit 1
}

# Configure Code-Server (update password in config.yaml)
mkdir -p ~/.config/code-server
echo -e "${GREEN}✅ Configuring Code-Server...${RESET}"
vim ~/.config/code-server/config.yaml

# Start Code-Server
echo -e "${GREEN}✅ Starting Code-Server...${RESET}"
./code-server --auth none &

echo -e "${GREEN}😁 Setup completed successfully! You can access Code-Server now.${RESET}"
