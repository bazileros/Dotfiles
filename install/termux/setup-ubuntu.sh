#!/usr/bin/env bash
# install/termux/setup-ubuntu.sh — Termux: provision a proot Ubuntu server.
#
# Migrated from termux/4-setup_ubuntu_server.sh. Dropped vs the original:
# interactive "which shell?" alias appending and rc sourcing (aliases belong in
# Dotfiles/aliases/aliases.sh now), and the step-3 pointer to the deleted
# term-profile/ folder (points at install/code-server.sh instead).
#
# Run inside Termux. Uses the AnLinux Ubuntu installer (proot, no root).

set -euo pipefail

if [ -z "${PREFIX:-}" ] || [[ "$PREFIX" != /data/data/com.termux* ]]; then
  echo "run this inside Termux (PREFIX=/data/data/com.termux)" >&2
  exit 1
fi

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }

CONFIG_DIR="$HOME/.config/ubuntu_server"
mkdir -p "$CONFIG_DIR"

info "updating Termux packages"
pkg update -y && pkg upgrade -y

info "installing packages (wget, proot, neovim, python, git, curl)"
pkg install -y wget openssl-tool proot neovim python git curl

if [ ! -x "$CONFIG_DIR/start-ubuntu.sh" ]; then
  info "downloading the AnLinux Ubuntu installer"
  wget -O "$CONFIG_DIR/ubuntu.sh" \
    "https://raw.githubusercontent.com/EXALAB/AnLinux-Resources/master/Scripts/Installer/Ubuntu/ubuntu.sh"
  info "installing Ubuntu (this takes a while)"
  (cd "$CONFIG_DIR" && bash ubuntu.sh)
else
  info "Ubuntu already provisioned at $CONFIG_DIR"
fi

echo
echo "Start Ubuntu with:   bash $CONFIG_DIR/start-ubuntu.sh"
echo
echo "Next steps INSIDE the Ubuntu environment:"
echo "  1. apt update && apt install -y curl git"
echo "  2. clone this repo:   git clone https://github.com/<you>/Dotfiles.git"
echo "  3. web IDE (optional): bash Dotfiles/install/code-server.sh"
echo
echo "Want a 'ubuntu' shortcut? Add it to Dotfiles/aliases/aliases.sh, e.g.:"
echo "  alias ubuntu='bash $CONFIG_DIR/start-ubuntu.sh'"
