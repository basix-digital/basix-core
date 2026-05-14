#!/usr/bin/env bash
set -euo pipefail

vault_app_user="${VAULT_APP_USER:-basix_vault_app}"
vault_app_password="${VAULT_APP_PASSWORD:-basix_vault_app}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v vault_app_user="$vault_app_user" \
  -v vault_app_password="$vault_app_password" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L',
  :'vault_app_user',
  :'vault_app_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'vault_app_user'
)
\gexec

GRANT USAGE ON SCHEMA vault TO :"vault_app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vault TO :"vault_app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA vault TO :"vault_app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA vault TO :"vault_app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA vault GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"vault_app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA vault GRANT EXECUTE ON FUNCTIONS TO :"vault_app_user";
EOSQL
