# Color definitions for logging (PowerShell uses different syntax for colors)
$GREEN = "`e[32m"
$RED = "`e[31m"
$RESET = "`e[0m"

# Function to log messages
function Log {
    param (
        [string]$Message,
        [string]$Color
    )
    Write-Host "$Color$Message$RESET"
}

# Prompt for user information
$github_username = Read-Host "Enter your GitHub username"
$user_email = Read-Host "Enter your email address"
$github_token = Read-Host -AsSecureString "Enter your GitHub Personal Access Token" | ConvertFrom-SecureString
$repo_url = Read-Host "Enter the repository URL (e.g., username/repo.git)"

# Set global Git configuration
Log "✅ Setting up Git configuration..." $GREEN
git config --global user.name $github_username
git config --global user.email $user_email
git config --global credential.helper store

# Set remote URL with username and token
$remoteUrl = "https://${github_username}:${github_token}@github.com/${repo_url}"
git remote set-url origin $remoteUrl

Log "✅ Git configuration completed successfully!" $GREEN
Log "🔧 You will be prompted for your token the first time you push." $GREEN
Log "🔧 Subsequent pushes will use the stored username." $GREEN
