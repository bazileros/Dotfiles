#!/bin/bash

# Fail on any command.
set -euxo pipefail

# Install necessary plugins
echo "✅ Cloning zsh-syntax-highlighting plugin..."
mkdir -p ~/.oh-my-zsh/custom/plugins
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ~/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting

echo "✅ Cloning zsh-autosuggestions plugin..."
git clone https://github.com/zsh-users/zsh-autosuggestions.git ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions

# Copy the .zshrc configuration (make sure the configs directory exists)
echo "✅ Copying .zshrc..."
if [ -f configs/.zshrc ]; then
  cp configs/.zshrc ~/.zshrc
else
  echo "⚠️ Warning: configs/.zshrc not found. Please create one."
fi

# Copy the modified Agnoster Theme (make sure the theme file exists)
echo "✅ Copying erosdevs-agnoster.zsh-theme..."
if [ -f configs/erosdevs-agnoster.zsh-theme ]; then
  cp configs/erosdevs-agnoster.zsh-theme ~/.oh-my-zsh/themes/erosdevs-agnoster.zsh-theme
else
  echo "⚠️ Warning: configs/erosdevs-agnoster.zsh-theme not found. Please create one."
fi

# Switch the shell to Zsh
echo "✅ Changing default shell to zsh..."
chsh -s "$(command -v zsh)"

echo "😁😁 Installation completed successfully. (erosdevs-agnoster)"
