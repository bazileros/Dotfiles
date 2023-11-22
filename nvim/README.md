# 💤 Neovim conf

Refer to the [Bazileros](https://github.com/bazileros) to get started.

I built this on top off [lazyvim](https://github.com/lazyvim/lazyvim)

## Project Structure

The project is organized into the following directories:

- **ftdetect:** Neovim filetype detection configuration.
  - `kitty.vim`: Filetype detection settings for Kitty terminal.

- **ftplugin:** Neovim filetype plugin configuration.
  - `kitty.vim`: Filetype plugin settings for Kitty terminal.

- **lua:** Lua modules for configuration.
  - **config:**
    - `autocmds.lua`: Autocommands configuration.
    - `keymaps.lua`: Keymaps configuration.
    - `lazy.lua`: Lazy loading configuration.
    - `options.lua`: General options configuration.
  - **plugins:**
    - `catppucin.lua`: Configuration for the Catppuccin color scheme.
    - `codeium.lua`: Configuration for the Codeium plugin.
    - `Gruvbox.lua`: Configuration for the Gruvbox color scheme.
    - `Kanagawa.lua`: Configuration for the Kanagawa color scheme.
    - `Malange.lua`: Configuration for the Malange color scheme.
    - `NeoSolarized.lua`: Configuration for the NeoSolarized color scheme.
    - `nightfly.lua`: Configuration for the Nightfly color scheme.
    - `Nyoom.lua`: Configuration for the Nyoom color scheme.
    - `onedarkpro.lua`: Configuration for the One Dark Pro color scheme.
    - `rose_pine.lua`: Configuration for the Rose Pine color scheme.

- `init.lua`: Neovim main configuration file.
- `lazy-lock.json`: Lazygit configuration for Neovim.
- `lazyvim.json`: Lazyvim configuration for Neovim.
- `stylua.toml`: Stylua configuration file.

- **syntax:** Syntax highlighting configuration.
  - `kitty-session.vim`: Kitty terminal config syntax highlighting.
  - `kitty.vim`: Kitty terminal syntax highlighting.

- `README.md`: Additional information and instructions for Neovim configuration.

## Usage

This Neovim configuration is structured to enhance your coding experience. Follow the README files in each directory for detailed information on the configuration and usage.



