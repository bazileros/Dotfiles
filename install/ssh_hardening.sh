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
DROPIN=/etc/ssh/sshd_config.d/00-hardening.conf
INCLUDE_DIRECTIVE='/etc/ssh/sshd_config.d/*.conf'
EXPECTED_DROPIN_CONTENT=$'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no'

fail_ssh_config() {
  printf '%s\n' "$1" >&2
  exit 1
}

check_main_sshd_config() {
  local config=/etc/ssh/sshd_config line directive argument extra seen=0
  [[ -f "$config" && -r "$config" ]] || fail_ssh_config "cannot read $config"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    [[ "$line" =~ [^[:space:]] ]] || continue
    IFS=$' \t\r' read -r directive argument extra <<< "$line"
    directive="${directive,,}"
    if (( seen == 0 )); then
      [[ "$directive" == include && "$argument" == "$INCLUDE_DIRECTIVE" && -z "$extra" ]] ||
        fail_ssh_config "$config must have Include $INCLUDE_DIRECTIVE as its first active directive; refusing to continue"
      seen=1
      continue
    fi
    case "$directive" in
      match)   fail_ssh_config "active Match directive in $config; refusing to apply conditional SSH policy" ;;
      include) fail_ssh_config "unexpected additional Include directive in $config; refusing to continue" ;;
    esac
  done < "$config"
  (( seen == 1 )) || fail_ssh_config "$config is missing the required first active Include $INCLUDE_DIRECTIVE"
}

check_sshd_dropins() {
  local file line directive argument extra
  for file in /etc/ssh/sshd_config.d/*.conf; do
    [[ -e "$file" || -L "$file" ]] || continue
    [[ -f "$file" && -r "$file" ]] || fail_ssh_config "cannot read included SSH config file: $file"
    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%%#*}"
      [[ "$line" =~ [^[:space:]] ]] || continue
      IFS=$' \t\r' read -r directive argument extra <<< "$line"
      case "${directive,,}" in
        match)   fail_ssh_config "active Match directive in $file; refusing to apply conditional SSH policy" ;;
        include) fail_ssh_config "unexpected or nested Include directive in $file; refusing to continue" ;;
      esac
    done < "$file"
  done
}

check_main_sshd_config

if [[ -L "$DROPIN" ]]; then
  fail_ssh_config "refusing to follow symlink at $DROPIN"
elif [[ -e "$DROPIN" ]]; then
  [[ -f "$DROPIN" ]] || fail_ssh_config "refusing to overwrite non-regular file at $DROPIN"
  if ! printf '%s\n' "$EXPECTED_DROPIN_CONTENT" | cmp -s "$DROPIN" -; then
    fail_ssh_config "refusing to overwrite non-identical $DROPIN"
  fi
fi

check_sshd_dropins

if [[ ! -e "$DROPIN" ]]; then
  if ! (umask 077; set -o noclobber; printf '%s\n' "$EXPECTED_DROPIN_CONTENT" > "$DROPIN"); then
    fail_ssh_config "could not safely create $DROPIN"
  fi
fi
chmod 600 "$DROPIN"

if ! sshd -t; then
  echo "sshd config failed validation — NOT restarting. Check $DROPIN" >&2
  exit 1
fi
if ! EFFECTIVE_CONFIG="$(sshd -T 2>&1)"; then
  printf 'sshd -T failed — NOT restarting\n%s\n' "$EFFECTIVE_CONFIG" >&2
  exit 1
fi
for setting in \
  'permitrootlogin no' \
  'passwordauthentication no' \
  'kbdinteractiveauthentication no'; do
  if ! printf '%s\n' "$EFFECTIVE_CONFIG" | grep -Fx -- "$setting" >/dev/null; then
    printf "effective sshd config is missing '%s' — NOT restarting\n" "$setting" >&2
    exit 1
  fi
done
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
