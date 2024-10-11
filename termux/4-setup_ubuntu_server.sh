#!/bin/zsh  # Ensure this script runs in Zsh

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

# Create the config directory for Ubuntu server if it doesn't exist
CONFIG_DIR="$HOME/.config/ubuntu_server"
mkdir -p "$CONFIG_DIR"

# Update and upgrade Termux packages
echo -e "${GREEN}✅ Updating package lists...${RESET}"
pkg update -y && pkg upgrade -y
check_success

# Install necessary packages
echo -e "${GREEN}✅ Installing required packages...${RESET}"
pkg install wget openssl-tool proot neovim python -y
check_success

# Download and set up Ubuntu if not already installed
if [ ! -d "$HOME/ubuntu" ]; then
  echo -e "${GREEN}✅ Downloading Ubuntu setup script...${RESET}"
  wget -O "$CONFIG_DIR/ubuntu.sh" https://raw.githubusercontent.com/EXALAB/AnLinux-Resources/master/Scripts/Installer/Ubuntu/ubuntu.sh
  check_success
  
  echo -e "${GREEN}✅ Setting up Ubuntu...${RESET}"
  bash "$CONFIG_DIR/ubuntu.sh"
fi

# Prompt user to start Ubuntu now or later
read -p "Do you want to start Ubuntu now? (y/n): " start_now

if [[ "$start_now" == "y" ]]; then
    echo -e "${GREEN}✅ Starting Ubuntu...${RESET}"
    bash "$CONFIG_DIR/start-ubuntu.sh" &
else
    echo -e "${GREEN}🔄 You can start Ubuntu later by running 'bash $CONFIG_DIR/start-ubuntu.sh' in your Termux environment.${RESET}"
fi

# Create alias for starting the Ubuntu server in .zshrc or .bashrc
read -p "Which shell are you using? (bash/zsh): " shell_choice

# Get the current working directory for dynamic alias creation
current_dir=$(pwd)

if [[ "$shell_choice" == "zsh" ]]; then
    alias_file="$HOME/.oh-my-zsh/custom/aliases.zsh"
    echo "alias ubuntu='bash \"$current_dir/start-ubuntu.sh\"'" >> "$alias_file"
    echo -e "${GREEN}✅ Added alias 'ubuntu' to $alias_file.${RESET}"
elif [[ "$shell_choice" == "bash" ]]; then
    echo "alias ubuntu='bash \"$current_dir/start-ubuntu.sh\"'" >> "$HOME/.bashrc"
    echo -e "${GREEN}✅ Added alias 'ubuntu' to ~/.bashrc.${RESET}"
else
    echo -e "${RED}❌ Invalid shell choice. No alias added.${RESET}"
fi

# Source the appropriate configuration file to apply changes immediately
if [[ "$shell_choice" == "zsh" ]]; then
    source "$HOME/.zshrc"
elif [[ "$shell_choice" == "bash" ]]; then
    source "$HOME/.bashrc"
fi

# Instructions for next steps
echo -e "${GREEN}🔄 Next steps:${RESET}"
echo -e "1. Clone your repository to the Ubuntu server."
echo -e "2. Navigate to the cloned directory."
echo -e "3. Run the Code-Server setup script located in the 'term-profile' folder."

echo -e "${GREEN}😁 Setup completed successfully! You can access your Ubuntu environment now or later as needed.${RESET}"
