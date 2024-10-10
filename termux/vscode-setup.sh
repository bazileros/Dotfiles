#!/bin/bash

# Function to check command success
check_success() {
  if [ $? -ne 0 ]; then
    echo "Error occurred during the last command."
    exit 1
  fi
}

# Update and upgrade Termux packages
pkg update -y && pkg upgrade -y
check_success

# Install necessary packages
pkg install wget openssl-tool proot vim -y
check_success

# Download and set up Ubuntu if not already installed
if [ ! -d "$HOME/ubuntu" ]; then
  wget https://raw.githubusercontent.com/EXALAB/AnLinux-Resources/master/Scripts/Installer/Ubuntu/ubuntu.sh
  bash ubuntu.sh
fi

# Start Ubuntu
./start-ubuntu.sh

# Update Ubuntu packages
apt update && apt upgrade -y

# Download latest Code-Server release dynamically
latest_code_server=$(wget -qO- https://api.github.com/repos/coder/code-server/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
wget "https://github.com/coder/code-server/releases/download/${latest_code_server}/code-server-${latest_code_server:1}-linux-arm64.tar.gz"
check_success

# Extract Code-Server
tar -xvf "code-server-${latest_code_server:1}-linux-arm64.tar.gz"
cd "code-server-${latest_code_server:1}-linux-arm64/bin" || exit

# Configure Code-Server (update password in config.yaml)
mkdir -p ~/.config/code-server
vim ~/.config/code-server/config.yaml

# Start Code-Server
./code-server --auth none &
