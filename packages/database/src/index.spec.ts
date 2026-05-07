import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { createPrismaClient } from "./index";

describe("database package contract", () => {
  it("exports the generated control-plane Prisma models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

    assert.equal(modelNames.includes("Tenant"), true);
    assert.equal(modelNames.includes("App"), true);
    assert.equal(modelNames.includes("ApiToken"), true);
    assert.equal(modelNames.includes("ApiEvent"), true);
    assert.equal(modelNames.includes("UsageMetric"), true);
  });

  it("creates a PrismaClient instance without connecting eagerly", async () => {
    const client = createPrismaClient();

    assert.equal(typeof client.$connect, "function");
    assert.equal(typeof client.$disconnect, "function");

    await client.$disconnect();
  });
});
