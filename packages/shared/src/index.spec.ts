import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePlan,
  planKeySchema,
  planLimits,
  tenantStatusSchema,
} from "./index.js";

describe("shared domain contracts", () => {
  it("normalizes unknown or empty plans to starter", () => {
    assert.equal(normalizePlan(undefined), "starter");
    assert.equal(normalizePlan(null), "starter");
    assert.equal(normalizePlan("unknown"), "starter");
  });

  it("normalizes known plans case-insensitively", () => {
    assert.equal(normalizePlan("Pro"), "pro");
    assert.equal(normalizePlan("ENTERPRISE"), "enterprise");
  });

  it("keeps plan limits aligned with supported plan keys", () => {
    const planKeys = planKeySchema.options;

    assert.deepEqual(Object.keys(planLimits).sort(), [...planKeys].sort());
    assert.equal(planLimits.starter.monthlyRequestLimit, 10_000);
    assert.equal(planLimits.pro.monthlyRequestLimit, 100_000);
    assert.equal(planLimits.enterprise.monthlyRequestLimit, null);
  });

  it("rejects unsupported tenant statuses", () => {
    assert.equal(tenantStatusSchema.safeParse("active").success, true);
    assert.equal(tenantStatusSchema.safeParse("archived").success, false);
  });
});
