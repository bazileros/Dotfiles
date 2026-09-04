# Dotfiles

Personal dotfiles with a cross-platform setup layer. Linux (deb/rpm/arch), macOS,
Windows (via gh + WSL), and Termux. Zero-secrets policy: **no token or PAT ever
belongs in this repo, a git remote URL, or a git credential helper** — git auth
goes through the GitHub CLI (`gh`).

## Structure

Config lives in the repo and is symlinked into place by `install/bootstrap`:

| Path                    | Symlinked to              | What it is                                        |
|-------------------------|---------------------------|---------------------------------------------------|
| `coding-tools/nvim/`    | `~/.config/nvim`          | Neovim (LazyVim-based) configuration              |
| `shell/kitty/`          | `~/.config/kitty`         | Kitty terminal emulator configuration             |
| `coding-tools/opencode/opencode.json` | `~/.config/opencode/opencode.json` | opencode global config (file link only; runtime state stays machine-local) |
| `shell/oh-my-posh/`     | `~/.config/oh-my-posh`    | Prompt theme — same on zsh/bash/PowerShell        |
| `shell/fastfetch/`      | `~/.config/fastfetch`     | Startup system info (One Dark palette)            |
| `shell/aliases/aliases.sh` | `~/.aliases`           | Shared shell aliases — single source for zsh+bash |
| `shell/zsh/zshrc`       | `~/.zshrc`                | Lean zsh config (no oh-my-zsh), sources aliases + fetched plugins |
| `shell/bashrc`          | `~/.bashrc`               | Bash config, sources the same aliases file        |
| `install/fetch.sh`      | — (not symlinked)         | Fetches third-party content (zsh plugins, agent skills) — see below |

`install/` — the setup layer (not symlinked):

| File                        | Purpose                                                      |
|-----------------------------|--------------------------------------------------------------|
| `install/setup`             | Entry point: detects platform + package manager, runs steps  |
| `install/bootstrap`         | Idempotent symlink bootstrap (backs up existing files)       |
| `install/git.sh`            | Linux/macOS git identity via `gh`, ed25519 SSH key           |
| `install/git.ps1`           | Windows git identity via `gh` (no tokens, no PAT-in-URL)     |
| `install/ssh_hardening.sh`  | Debian/Ubuntu SSH server hardening (key-only auth, ufw)      |
| `install/code-server.sh`    | Optional: latest code-server into `~/.local` (rootless)      |
| `install/termux/setup-ubuntu.sh` | Optional: proot Ubuntu server inside Termux            |

## Third-party content (fetched, not hosted)

Everything below is downloaded by `install/fetch.sh`, never committed to this
repo (see `.gitignore`):

- **Zsh plugins** — cloned at pinned release tags into `shell/zsh/plugins/`
  by `install/fetch.sh`: `zsh-autosuggestions` (v0.7.1) and
  `zsh-syntax-highlighting` (0.8.0). `shell/zsh/zshrc` sources them if present.
- **Agent skills** — installed into repo-local `.agents/` and `.claude/`
  (git-ignored) from the skills.sh registry via `npx skills add`; existing
  installs are restored from the committed `skills-lock.json` via
  `npx skills experimental_install`.
- **Vendored exception** — `ai-tools/skills/alchemy-cloudflare` is checked in
  because it is not on the registry.

## Bootstrap (one command)

```sh
git clone git@github.com:<you>/Dotfiles.git   # or https://…, gh handles auth
cd Dotfiles
./install/setup            # dry run: prints the plan, changes nothing
./install/setup --apply    # actually runs the steps
```

`install/setup` detects Linux (apt/dnf/pacman/zypper), macOS (Homebrew), WSL,
Termux, and native Windows, then: installs missing shell essentials (git, zsh,
curl), prompt tooling (`fastfetch` from your package manager; `oh-my-posh` from
pacman when available, otherwise its official installer, otherwise the AUR via
paru/yay — not in most distro repos), symlinks the configs via
`install/bootstrap`, and sets up git identity.

## Prompt & startup info

One oh-my-posh theme for every shell — zsh, bash, PowerShell (and macOS/Termux):
`shell/oh-my-posh/theme.jsonc`, an agnoster-style prompt colored to match the kitty
One Dark palette (user@host, cwd, git status, exit code, prompt on a new line).
`zshrc`/`bashrc` init it when the binary is present, so shells without it still
work. Same for `fastfetch`, which prints a one-shot system summary (OS, kernel,
uptime, shell, terminal, CPU/GPU, memory, color strip) on interactive shell
start — both are linked into `~/.config` by `bootstrap`.

You can also run the pieces individually:

```sh
./install/bootstrap                # symlink configs into ~
./install/bootstrap --dry-run      # preview only
./install/git.sh                   # git identity (Linux/macOS)
```

`bootstrap` never clobbers silently: an existing real file is moved to
`<target>.bak` (with a warning), a broken symlink is replaced, and a symlink
that already points at the repo is skipped. Re-running it is safe.

## Cross-platform

| Platform  | How                                                              |
|-----------|------------------------------------------------------------------|
| Linux     | `install/setup` picks apt/dnf/zypper/pacman automatically         |
| macOS     | Same flow via Homebrew (`install/setup` installs git, gh, oh-my-posh, fastfetch) |
| Windows   | PowerShell: `install/git.ps1` (needs gh) + `winget install JanDeDobbeleer.OhMyPosh` for the same prompt. Shell configs + config dirs: run `install/setup` inside WSL, or `mklink` manually |
| Termux    | `install/setup` (pkg branch), plus optional `install/termux/setup-ubuntu.sh` for a proot Ubuntu server |
| Servers   | `install/ssh_hardening.sh` (Debian/Ubuntu): non-root sudo user, key-only SSH, optional fail2ban + ufw |

## Git setup — `gh`, never tokens

`install/git.sh` (Linux/macOS) and `install/git.ps1` (Windows) replace the old
root `git_setup.sh`/`git_setup-WIN.ps1`:

- run `gh auth login` (browser/device flow) — gh stores the token in its own
  encrypted store, never in git config or a remote URL
- `gh auth setup-git` — git talks to gh for HTTPS credentials, no plaintext
  `credential.helper store`
- identity (`user.name`/`user.email`) is read from your GitHub account
- ensures an `~/.ssh/id_ed25519` key and prints/optionally uploads the public
  key (the old Windows script embedded a PAT in the remote URL — that class of
  leak is gone by design)
- no gh? `git.sh` falls back to plain git config + keygen (email prompt only)

## Zero-secrets policy

- No PATs/tokens in files, remote URLs, or credential helpers. Ever.
- The only secret artifacts are SSH keys you generate yourself, in your own
  `~/.ssh`.
- `.gitignore` excludes `.env/`, `*.local`, `*.bak`, credentials and secrets —
  if a file needs a secret, it does not belong in this repo.

## License

Open-sourced under the [MIT License](LICENSE).
