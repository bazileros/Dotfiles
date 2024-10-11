# Fail on any command.
set -eux pipefail

# Install plug-ins (you can git-pull to update them later).
echo "✅ Cloning zsh-syntax-highlighting plugin..."
(cd ~/.oh-my-zsh/custom/plugins && git clone https://github.com/zsh-users/zsh-syntax-highlighting)

echo "✅ Cloning zsh-autosuggestions plugin..."
(cd ~/.oh-my-zsh/custom/plugins && git clone https://github.com/zsh-users/zsh-autosuggestions)

# Replace the configs with the saved one.
echo "✅ Copying .zshrc..."
cp configs/.zshrc ~/.zshrc

# Copy the modified Agnoster Theme
echo "✅ Copying erosdevs-agnoster.zsh-theme..."
cp configs/erosdevs-agnoster.zsh-theme ~/.oh-my-zsh/themes/erosdevs-agnoster.zsh-theme

# Color Theme
echo "✅ Loading terminal profile..."
dconf load /org/gnome/terminal/legacy/profiles:/:fb358fc9-49ea-4252-ad34-1d25c649e633/ < configs/terminal_profile.dconf

# Add it to the default list in the terminal
add_list_id=fb358fc9-49ea-4252-ad34-1d25c649e633
old_list=$(dconf read /org/gnome/terminal/legacy/profiles:/list | tr -d "]")

if [ -z "$old_list" ]; then
    front_list="["
else
    front_list="$old_list, "
fi

new_list="$front_list'$add_list_id']"
dconf write /org/gnome/terminal/legacy/profiles:/list "$new_list" 
dconf write /org/gnome/terminal/legacy/profiles:/default "'$add_list_id'"

# Switch the shell.
echo "✅ Changing default shell to zsh..."
chsh -s "$(command -v zsh)"

echo "✅ Installation completed successfully. (erosdevs-agnoster)"
