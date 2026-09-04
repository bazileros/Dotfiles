# fastfetch — startup system info

Runs once per interactive shell start (`zshrc` / `bashrc`), showing OS, CPU,
memory, disk, local IP, net throughput, media, weather, uptime and a color
strip. This is the user's real config — custom cat logo, ` ➜ ` separator,
per-module key colors.

## Where it lives

`install/bootstrap` symlinks `fastfetch/` to `~/.config/fastfetch`, which is
the default location fastfetch reads automatically. To point at it directly:

```sh
fastfetch --config "$DOTFILES/fastfetch/config.jsonc" --logo none
```

## Customize

`config.jsonc` is JSONC — edit and preview:

```sh
fastfetch --config "$DOTFILES/fastfetch/config.jsonc" --logo none
```

- Logo: inline ASCII art under `logo.source` (`"type": "data"`); padding and
  color (magenta) set in the same block.
- Info lines: edit the `"modules"` array (add/remove/reorder). `media` and
  `weather` are the personal pick here — `weather` has a 1000ms timeout.
- Colors: each module has its own `keyColor` (cyan/blue/yellow/green/magenta).

## Install

`install/setup` installs `fastfetch` from your package manager
(apt/dnf/zypper/pacman/brew/pkg) when missing.