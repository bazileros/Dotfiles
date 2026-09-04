#!/usr/bin/env bash
# install/ssh_hardening.sh — harden a Debian/Ubuntu SSH server.
#
# Migrated from term-profile/4-ssh_hardning.sh. Changes vs the original:
#   * sshd settings go in a /etc/ssh/sshd_config.d/ drop-in (no fragile sed
#     on sshd_config), validated with `sshd -t` before restart
#   * the server-side user keygen is dropped: it generated a key ON the server
#     and asked you to copy the *public* half to your client — backwards.
#     Keys belong on your client; you paste/ssh-copy-id the public key here.
#   * fail2ban + ufw are now opt-in (a prompt), not forced
#
# Run ON the server as root (or sudo). WARNING: your key must be installed
# below BEFORE password auth is disabled, or you will lock yourself out.

set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run as root (or: sudo $0)" >&2; exit 1; }
command -v apt-get >/dev/null 2>&1 || { echo "this script targets Debian/Ubuntu servers (apt-get)" >&2; exit 1; }
command -v sshd >/dev/null 2>&1 || { echo "openssh-server does not appear to be installed" >&2; exit 1; }

banner() { printf '\n====================================\n%s\n====================================\n' "$1"; }
# prompt on stderr so command substitution captures only the answer
ask()    { printf '%s ' "$1" >&2; read -r ANS || exit 1; printf '%s' "$ANS"; }

banner "1/5 — update packages"
apt-get update && apt-get upgrade -y

banner "2/5 — create a non-root sudo user"
USERNAME="$(ask "New username:")"
if id "$USERNAME" >/dev/null 2>&1; then
  echo "user '$USERNAME' already exists — skipping creation" >&2
else
  adduser --gecos "" "$USERNAME"
  usermod -aG sudo "$USERNAME"
fi
USER_HOME="/home/$USERNAME"

banner "3/5 — install your public key for $USERNAME"
echo "From your CLIENT machine (not here), log in with your password and run:"
echo "    ssh-copy-id $USERNAME@<this-server-ip>"
echo
echo "or paste the contents of your client's ~/.ssh/id_ed25519.pub below"
echo "and press Enter (leave empty if you used ssh-copy-id):"
read -r PUBKEY || true
if [ -n "$PUBKEY" ]; then
  mkdir -p "$USER_HOME/.ssh"
  echo "$PUBKEY" >> "$USER_HOME/.ssh/authorized_keys"
  chmod 700 "$USER_HOME/.ssh"
  chmod 600 "$USER_HOME/.ssh/authorized_keys"
  chown -R "$USERNAME:$USERNAME" "$USER_HOME/.ssh"
  echo "key installed for $USERNAME"
fi
ask "Verify key login works from a SECOND terminal, then press Enter to continue:"

banner "4/5 — key-only auth (root login + passwords off)"
DROPIN=/etc/ssh/sshd_config.d/99-hardening.conf
if ! grep -qs '^Include' /etc/ssh/sshd_config; then
  echo "adding Include line to sshd_config"
  echo 'Include /etc/ssh/sshd_config.d/*.conf' >> /etc/ssh/sshd_config
fi
cat > "$DROPIN" <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
chmod 600 "$DROPIN"

if ! sshd -t; then
  echo "sshd config failed validation — NOT restarting. Check $DROPIN" >&2
  exit 1
fi
echo "config valid — restarting sshd"
systemctl restart ssh 2>/dev/null || systemctl restart sshd

banner "5/5 — optional firewall + brute-force protection"
ANSWER="$(ask "Install fail2ban + ufw and enable the firewall? [y/N]")"
case "$ANSWER" in
  y|Y)
    apt-get install -y fail2ban ufw
    ufw allow OpenSSH
    ufw --force enable
    echo "fail2ban + ufw enabled (OpenSSH allowed)"
    ;;
  *)
    echo "skipped — consider: apt-get install fail2ban ufw && ufw allow OpenSSH && ufw enable"
    ;;
esac

banner "done"
echo "Log in as '$USERNAME' with your key. Existing sessions stay open;"
echo "root login and password auth are now disabled."
