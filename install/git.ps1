# install/git.ps1 — Windows git identity + SSH key via gh. Zero secrets.
#
# Rewritten from the old root git_setup-WIN.ps1, which embedded a PAT in the
# remote URL and enabled `credential.helper store` (plaintext token on disk).
# Both are gone: gh keeps the token in its own encrypted store, and
# `gh auth setup-git` makes git use gh as the credential helper.
#
# Requires: GitHub CLI (gh).  Install:  winget install --id GitHub.cli
#
# Run in PowerShell:
#   powershell -ExecutionPolicy Bypass -File install/git.ps1

$ErrorActionPreference = 'Stop'

function Info { Write-Host "==> $args" -ForegroundColor Cyan }
function Warn { Write-Host "!!  $args" -ForegroundColor Yellow }
function Done { Write-Host "==> $args" -ForegroundColor Green }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Warn 'GitHub CLI (gh) is not installed.'
    Warn 'Install it with:  winget install --id GitHub.cli   (then reopen the terminal)'
    exit 1
}

# 1. Authenticate — interactive, stores the token in gh's secure store only
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Info 'No active gh session — starting gh auth login'
    gh auth login
    if ($LASTEXITCODE -ne 0) {
        Warn 'gh auth login did not complete — aborting.'
        exit 1
    }
}

# 2. git uses gh as credential helper: no plaintext credential.helper store,
#    no token ever embedded in a remote URL
gh auth setup-git
Info 'git will use gh for HTTPS credentials (no plaintext token storage)'

# 3. Identity read from the GitHub account — nothing typed in by hand
$login = (gh api user --jq .login).Trim()
$email = (gh api user --jq .email).Trim()
if (-not $email -or $email -eq 'null') {
    $id = (gh api user --jq .id).Trim()
    $email = "$id+$login@users.noreply.github.com"
    Warn "No public email on your GitHub account — using $email"
}
git config --global user.name  $login
git config --global user.email $email
Info "git identity: $login <$email>"

# 4. ed25519 SSH key when missing (for git@github.com remotes)
$key = Join-Path $HOME '.ssh\id_ed25519'
if (-not (Test-Path $key)) {
    Info 'No SSH key found — generating an ed25519 key'
    ssh-keygen -t ed25519 -C $email -f $key
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Info 'Public key (add it at github.com/settings/ssh/new):'
    Get-Content "$key.pub"
    $up = Read-Host 'Upload this key to GitHub now? [y/N]'
    if ($up -match '^y') {
        gh ssh-key add "$key.pub" -t "$env:COMPUTERNAME-$((Get-Date).ToString('yyyy-MM-dd'))"
    }
} else {
    Info "SSH key already present: $key"
}

Done 'Done. No token was written to any remote URL or credential store.'
Info 'Prefer SSH remotes:  git remote set-url origin git@github.com:<user>/<repo>.git'
