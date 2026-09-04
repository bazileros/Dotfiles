#!/usr/bin/env bash
# install/code-server.sh — install code-server (web VS Code), rootless.
#
# Just the official installer now (handles arch detection + latest lookup):
#   curl -fsSL https://code-server.dev/install.sh | sh
# Replaces the previous 77-line hand-rolled version.
#
#   ./install/code-server.sh             install
#   ./install/code-server.sh --dry-run   print plan only
#
# Run on the machine where you want the web IDE (a normal Linux box or a
# proot/VM Ubuntu server). Needs curl.

set -euo pipefail

DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

if $DRY_RUN; then
  echo "would run: curl -fsSL https://code-server.dev/install.sh | sh"
  exit 0
fi

curl -fsSL https://code-server.dev/install.sh | sh

echo
echo "Run it with:  code-server  (defaults: http://localhost:8080, auth password)"
echo "Set the password per session with \$PASSWORD, or write"
echo "~/.config/code-server/config.yaml — never commit that file anywhere."