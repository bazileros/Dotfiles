#!/bin/bash

# Color definitions for logging
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET="\033[0m"

# Function to check command success
check_success() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error occurred during the last command.${RESET}"
        exit 1
    fi
}

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
cd "code-server-${latest_code_server:1}-linux-arm64/bin" || { echo "Failed to enter directory"; exit 1; }

# Configure Code-Server (update password in config.yaml)
mkdir -p ~/.config/code-server

# Check if config.yaml already exists and create it if not
if [ ! -f ~/.config/code-server/config.yaml ]; then
    echo "bind-addr: localhost:8080" > ~/.config/code-server/config.yaml
    echo "auth: password" >> ~/.config/code-server/config.yaml
    echo "password: password" >> ~/.config/code-server/config.yaml # Default password, change as needed
    echo "cert: no" >> ~/.config/code-server/config.yaml # Default setting for SSL certificate
else
    echo -e "${YELLOW}⚠️ config.yaml already exists. Please update the password manually if needed.${RESET}"
fi

# Open config.yaml in vim for manual editing
vim ~/.config/code-server/config.yaml

# Prompt user for shell choice to set up alias
read -p "Which shell are you using? (bash/zsh): " shell_choice

if [[ "$shell_choice" == "zsh" ]]; then
    # Create or append to aliases.zsh file for Zsh users
    alias_file="$HOME/.oh-my-zsh/custom/aliases.zsh"
    echo "alias code='./path/to/code-server --auth none'" >> "$alias_file"
    echo -e "${GREEN}✅ Added alias 'code' to $alias_file.${RESET}"
elif [[ "$shell_choice" == "bash" ]]; then
    # Create or append to .bashrc file for Bash users
    echo "alias code='./path/to/code-server --auth none'" >> "$HOME/.bashrc"
    echo -e "${GREEN}✅ Added alias 'code' to ~/.bashrc.${RESET}"
else
    echo -e "${RED}❌ Invalid shell choice. No alias added.${RESET}"
fi

echo -e "${GREEN}🔄 You can run Code-Server later using the 'code' command.${RESET}"

# Final prompt to run Code-Server now or later
read -p "Do you want to run Code-Server now? (y/n): " run_now

if [[ "$run_now" == "y" ]]; then
    echo -e "${GREEN}✅ Starting Code-Server...${RESET}"
    ./code-server --auth none &
else
    echo -e "${GREEN}😁 Setup completed successfully! You can access Code-Server later using the alias.${RESET}"
fi
