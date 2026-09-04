# oh-my-posh — cross-shell prompt theme

One theme, every shell: zsh, bash, Windows PowerShell, macOS, Termux. It only
needs the `oh-my-posh` binary and this single JSONC file.

## Colors

The palette is the kitty theme's One Dark Pro set (`kitty/kitty.conf`):

| Role            | Color  |
|-----------------|--------|
| user/host       | `#c678dd` (magenta) |
| cwd             | `#61afef` (blue)    |
| git             | `#98c379` (green)   |
| last exit != 0  | `#e06c75` (red)     |
| text on colors  | `#282c34` / `#ffffff` |

## Where it lives

The shells reference the repo path directly (no symlink needed for them):

- zsh  (this repo.s shell/zsh/zshrc.): `eval "$(oh-my-posh init zsh --config "$DOTFILES/shell/oh-my-posh/theme.jsonc")"`
- bash (this repo.s shell/bashrc.): `eval "$(oh-my-posh init bash --config "$DOTFILES/shell/oh-my-posh/theme.jsonc")"`

`install/bootstrap` also links `oh-my-posh/` to `~/.config/oh-my-posh` so tools
that follow the `~/.config/oh-my-posh` convention (e.g. a PowerShell profile)
can use `~/.config/oh-my-posh/theme.jsonc` / `$env:POSH_THEME`.

## Regenerate / edit

`theme.jsonc` is a hand-written JSONC file; edit it directly. Preview changes
live without touching your shell (`print primary` renders the prompt; older
oh-my-posh versions call this `print prompt`):

```sh
oh-my-posh print primary --config "$DOTFILES/shell/oh-my-posh/theme.jsonc"
```

Render with realistic state (exit code, pwd):

```sh
oh-my-posh print primary --config "$DOTFILES/shell/oh-my-posh/theme.jsonc" --status 1 --pwd ~/projects/Dotfiles
```

## Install

`install/setup` installs the `oh-my-posh` binary (official installer, no root):

```sh
curl -s https://ohmyposh.dev/install.sh | bash -s
```

Windows: `winget install JanDeDobbeleer.OhMyPosh`.
