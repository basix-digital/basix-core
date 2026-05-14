FROM pgvector/pgvector:pg16

ARG PGSODIUM_REF=""
ARG SUPABASE_VAULT_REF=""

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      git \
      libsodium-dev \
      openssl \
      postgresql-server-dev-16 \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/michelp/pgsodium.git /tmp/pgsodium \
    && cd /tmp/pgsodium \
    && if [ -n "$PGSODIUM_REF" ]; then git checkout "$PGSODIUM_REF"; fi \
    && make \
    && make install \
    && rm -rf /tmp/pgsodium

RUN git clone https://github.com/supabase/vault.git /tmp/supabase-vault \
    && cd /tmp/supabase-vault \
    && if [ -n "$SUPABASE_VAULT_REF" ]; then git checkout "$SUPABASE_VAULT_REF"; fi \
    && make \
    && make install \
    && rm -rf /tmp/supabase-vault

COPY infra/postgres-vault/pgsodium-getkey /usr/local/bin/pgsodium-getkey
COPY infra/postgres-vault/docker-entrypoint-vault.sh /usr/local/bin/docker-entrypoint-vault.sh
COPY infra/postgres-vault/init/00-init-vault.sh /docker-entrypoint-initdb.d/00-init-vault.sh
COPY infra/postgres-vault/smoke.sql /usr/local/share/basix-vault-smoke.sql

RUN chmod 0755 /usr/local/bin/pgsodium-getkey \
    && chmod 0755 /usr/local/bin/docker-entrypoint-vault.sh \
    && chmod 0755 /docker-entrypoint-initdb.d/00-init-vault.sh \
    && chmod 0644 /usr/local/share/basix-vault-smoke.sql

ENTRYPOINT ["docker-entrypoint-vault.sh"]
