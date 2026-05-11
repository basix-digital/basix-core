import { Pool, type PoolClient, type QueryResult } from "pg";

export interface VaultSecretInput {
  name: string;
  secret: string;
  description?: string;
}

export interface VaultSecretUpdateInput extends VaultSecretInput {
  vaultSecretId: string;
}

export interface VaultClientOptions {
  connectionString?: string;
  pool?: VaultPool;
}

export interface VaultPool {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  connect?(): Promise<PoolClient>;
  end?(): Promise<void>;
}

export class VaultOperationError extends Error {
  constructor(operation: string) {
    super(`Vault ${operation} failed`);
    this.name = "VaultOperationError";
  }
}

export class VaultClient {
  private readonly pool: VaultPool;

  constructor(options: VaultClientOptions = {}) {
    if (options.pool) {
      this.pool = options.pool;
      return;
    }

    const connectionString =
      options.connectionString ?? process.env.VAULT_DATABASE_URL;
    if (!connectionString) {
      throw new Error("VAULT_DATABASE_URL is required");
    }

    this.pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  async createSecret(input: VaultSecretInput) {
    try {
      const result = await this.pool.query<{ id: string }>(
        "SELECT vault.create_secret($1, $2, $3) AS id",
        [input.secret, input.name, input.description ?? null],
      );
      return result.rows[0].id;
    } catch {
      throw new VaultOperationError("create secret");
    }
  }

  async updateSecret(input: VaultSecretUpdateInput) {
    try {
      await this.pool.query(
        "SELECT vault.update_secret($1::uuid, $2, $3, $4)",
        [
          input.vaultSecretId,
          input.secret,
          input.name,
          input.description ?? null,
        ],
      );
    } catch {
      throw new VaultOperationError("update secret");
    }
  }

  async readSecret(vaultSecretId: string) {
    try {
      const result = await this.pool.query<{ decrypted_secret: string }>(
        "SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1::uuid",
        [vaultSecretId],
      );
      return result.rows[0]?.decrypted_secret ?? null;
    } catch {
      throw new VaultOperationError("read secret");
    }
  }

  async assertVaultReady() {
    try {
      await this.pool.query("SELECT 1 FROM vault.decrypted_secrets LIMIT 0");
    } catch {
      throw new VaultOperationError("health check");
    }
  }

  async close() {
    await this.pool.end?.();
  }
}

let defaultClient: VaultClient | null = null;

export function createVaultClient(options: VaultClientOptions = {}) {
  return new VaultClient(options);
}

function getDefaultClient() {
  defaultClient ??= new VaultClient();
  return defaultClient;
}

export function createSecret(input: VaultSecretInput) {
  return getDefaultClient().createSecret(input);
}

export function updateSecret(input: VaultSecretUpdateInput) {
  return getDefaultClient().updateSecret(input);
}

export function readSecret(vaultSecretId: string) {
  return getDefaultClient().readSecret(vaultSecretId);
}

export function assertVaultReady() {
  return getDefaultClient().assertVaultReady();
}
