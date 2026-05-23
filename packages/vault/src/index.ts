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
  readonly cause?: VaultOperationErrorCause;

  constructor(operation: string, cause?: unknown) {
    const safeCause = toSafeCause(cause);
    const detail = describeSafeCause(safeCause);
    super(`Vault ${operation} failed${detail ? `: ${detail}` : ""}`);
    this.name = "VaultOperationError";
    this.cause = safeCause;
  }
}

interface VaultOperationErrorCause {
  code?: string;
  constraint?: string;
  routine?: string;
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
    } catch (error) {
      throw new VaultOperationError("create secret", error);
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
    } catch (error) {
      throw new VaultOperationError("update secret", error);
    }
  }

  async readSecret(vaultSecretId: string) {
    try {
      const result = await this.pool.query<{ decrypted_secret: string }>(
        "SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1::uuid",
        [vaultSecretId],
      );
      return result.rows[0]?.decrypted_secret ?? null;
    } catch (error) {
      throw new VaultOperationError("read secret", error);
    }
  }

  async deleteSecret(vaultSecretId: string) {
    try {
      await this.pool.query("DELETE FROM vault.secrets WHERE id = $1::uuid", [
        vaultSecretId,
      ]);
    } catch (error) {
      throw new VaultOperationError("delete secret", error);
    }
  }

  async assertVaultReady() {
    try {
      await this.pool.query("SELECT 1 FROM vault.decrypted_secrets LIMIT 0");
    } catch (error) {
      throw new VaultOperationError("health check", error);
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

export function deleteSecret(vaultSecretId: string) {
  return getDefaultClient().deleteSecret(vaultSecretId);
}

export function assertVaultReady() {
  return getDefaultClient().assertVaultReady();
}

function toSafeCause(cause: unknown): VaultOperationErrorCause | undefined {
  if (!cause || typeof cause !== "object") {
    return undefined;
  }

  const error = cause as {
    code?: unknown;
    constraint?: unknown;
    routine?: unknown;
  };
  const safeCause = {
    code: typeof error.code === "string" ? error.code : undefined,
    constraint:
      typeof error.constraint === "string" ? error.constraint : undefined,
    routine: typeof error.routine === "string" ? error.routine : undefined,
  };

  return Object.values(safeCause).some(Boolean) ? safeCause : undefined;
}

function describeSafeCause(cause?: VaultOperationErrorCause) {
  if (!cause) {
    return "";
  }

  const parts = [
    cause.code ? `code=${cause.code}` : "",
    cause.constraint ? `constraint=${cause.constraint}` : "",
    cause.routine ? `routine=${cause.routine}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}
