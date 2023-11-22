# Fail on any command.
set -eux pipefail

# Install ZSH
echo "✅ Installing ZSH, Curl & Git-Core..."
sudo apt install -y git-core zsh curl
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
