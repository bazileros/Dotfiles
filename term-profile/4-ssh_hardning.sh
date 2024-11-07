#!/bin/bash

# Function to display a message
function echo_message {
    echo "===================================="
    echo "$1"
    echo "===================================="
}

# Update and upgrade packages
echo_message "Updating and upgrading packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Create a non-root user
read -p "Enter new username: " username
if id "$username" &>/dev/null; then
    echo "User '$username' already exists. Exiting."
    exit 1
fi

sudo adduser "$username"
sudo usermod -aG sudo "$username"

# Disable root login
echo_message "Disabling root login..."
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication
echo_message "Disabling password authentication..."
sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Set up SSH key authentication
echo_message "Setting up SSH key authentication for user '$username'..."
sudo -u "$username" ssh-keygen -t ed25519 -C "$username@$(hostname)" -f "/home/$username/.ssh/id_ed25519" -N ""
echo "Public key generated. Please copy the following public key to your local machine:"
cat "/home/$username/.ssh/id_ed25519.pub"
read -p "Press [Enter] once you have copied the public key."

# Restart SSH service to apply changes
echo_message "Restarting SSH service..."
sudo systemctl restart sshd

# Install security tools
echo_message "Installing security tools (fail2ban and UFW)..."
sudo apt-get install fail2ban ufw -y

# Configure UFW
echo_message "Configuring UFW (Uncomplicated Firewall)..."
sudo ufw allow OpenSSH
sudo ufw enable

# Final message
echo_message "SSH hardening completed successfully!"
echo "You can now log in as '$username' using SSH keys."
