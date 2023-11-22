# Dotfiles

This repository contains configuration files for various tools and applications, including Kitty, Neovim, and Terminal profiles.

## Project Structure

The project is organized into the following directories:

- **kitty:** Configuration files for the Kitty terminal emulator.
  - `kitty.conf`: Kitty configuration file.
  - `README.md`: Additional information and instructions for Kitty configuration.

- **nvim:** Configuration files for Neovim.
  - `ftdetect`: Neovim filetype detection configuration.
  - `ftplugin`: Neovim filetype plugin configuration.
  - `syntax`: Syntax highlighting configuration.
  - `init.lua`: Neovim main configuration file.
  - `lazy-lock.json`: Lazygit configuration for Neovim.
  - `lazyvim.json`: Lazyvim configuration for Neovim.
  - `lua`: Lua modules for configuration.
    - `config`: Specific configurations like autocmds, keymaps, etc.
    - `plugins`: Configuration for various plugins.
  - `stylua.toml`: Stylua configuration file.
  - `README.md`: Additional information and instructions for Neovim configuration.

- **Term-profile:** Terminal profile installation scripts and configuration.
  - `configs`: Configuration files for the terminal.
  - `fonts`: Fonts used in the terminal.
  - `0-install_powerline.sh`: Script to install Powerline for the terminal.
  - `1-install_terminal.sh`: Script to install the terminal emulator.
  - `2-install_profile.sh`: Script to install the terminal profile.
  - `README.md`: Additional information and instructions for terminal profile installation.
  - `terminal_screenshot.png`: Screenshot of the terminal with the configured profile.

- **README.md:** This file providing an overview of the project.

## Usage

Each directory contains specific instructions on how to install and configure the corresponding tool or application. Follow the README files in each directory for detailed information.

## License

This project is open-sourced under the [MIT License](LICENSE).

