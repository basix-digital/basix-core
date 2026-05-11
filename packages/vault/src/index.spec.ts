import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QueryResult } from "pg";
import { VaultClient, VaultOperationError, type VaultPool } from "./index";

describe("vault package contract", () => {
  it("creates secrets through supabase_vault without returning the secret", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = new VaultClient({
      pool: createMockPool(calls, [{ id: "secret-id" }]),
    });

    const id = await client.createSecret({
      name: "tenant/openrouter/api_key",
      secret: "super-secret",
      description: "OpenRouter API key",
    });

    assert.equal(id, "secret-id");
    assert.equal(calls[0].text, "SELECT vault.create_secret($1, $2, $3) AS id");
    assert.deepEqual(calls[0].values, [
      "super-secret",
      "tenant/openrouter/api_key",
      "OpenRouter API key",
    ]);
  });

  it("reads decrypted secrets by vault id", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = new VaultClient({
      pool: createMockPool(calls, [{ decrypted_secret: "decrypted" }]),
    });

    await assert.doesNotReject(async () => {
      const secret = await client.readSecret("vault-id");
      assert.equal(secret, "decrypted");
    });
    assert.equal(calls[0].values?.[0], "vault-id");
  });

  it("redacts operation failures", async () => {
    const client = new VaultClient({
      pool: {
        async query() {
          throw new Error("database leaked secret-value");
        },
      },
    });

    await assert.rejects(
      () =>
        client.createSecret({
          name: "name",
          secret: "secret-value",
        }),
      (error) => {
        assert.equal(error instanceof VaultOperationError, true);
        assert.equal(String(error).includes("secret-value"), false);
        return true;
      },
    );
  });
});

function createMockPool(
  calls: Array<{ text: string; values?: unknown[] }>,
  rows: Array<Record<string, unknown>>,
): VaultPool {
  return {
    async query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ) {
      calls.push({ text, values });
      return { rows } as QueryResult<T>;
    },
  };
}
