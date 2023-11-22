# Fail on any command.
set -eux pipefail

# Install Powerline for VIM.
echo "✅ Installing python3-pip..."
sudo apt install -y python3-pip

echo "✅ Installing powerline-status..."
pip install --user powerline-status --break-system-packages

echo "✅ Copying .vimrc..."
sudo apt install -y vim
sudo cp configs/.vimrc ~/.vimrc

echo "✅ Installing fonts-powerline..."
sudo apt install -y fonts-powerline

# Install Patched Font
echo "✅ Creating ~/.fonts directory..."
mkdir -p ~/.fonts

echo "✅ Copying fonts..."
sudo cp -a fonts/. ~/.fonts/

echo "✅ Updating font cache..."
fc-cache -vf ~/.fonts/

echo "😁😁Installation completed successfully."
