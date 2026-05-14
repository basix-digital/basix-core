\set ON_ERROR_STOP on

SELECT extname
FROM pg_extension
WHERE extname IN ('pgsodium', 'supabase_vault')
ORDER BY extname;

SET ROLE basix_vault_app;

SELECT vault.create_secret(
  'local-vault-smoke-secret',
  'basix_vault_smoke',
  'local smoke test'
) AS smoke_secret_id
\gset

SELECT decrypted_secret = 'local-vault-smoke-secret' AS secret_roundtrip
FROM vault.decrypted_secrets
WHERE id = :'smoke_secret_id'::uuid;

DELETE FROM vault.secrets
WHERE id = :'smoke_secret_id'::uuid;

RESET ROLE;
