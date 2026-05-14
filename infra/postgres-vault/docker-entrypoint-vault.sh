#!/usr/bin/env bash
set -euo pipefail

key_file="${PGSODIUM_KEY_FILE:-/var/lib/postgresql/pgsodium/pgsodium.key}"
key_dir="$(dirname "$key_file")"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$key_dir"
  chown -R postgres:postgres "$key_dir"
  chmod 0700 "$key_dir"

  if [ ! -f "$key_file" ]; then
    umask 077
    openssl rand -hex 32 > "$key_file"
    chown postgres:postgres "$key_file"
    chmod 0600 "$key_file"
  fi
fi

exec docker-entrypoint.sh "$@"
