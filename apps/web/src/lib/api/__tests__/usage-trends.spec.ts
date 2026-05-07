import { describe, expect, it } from "@jest/globals";
import { mergeUsageTrends } from "@/lib/api/usage-trends";

describe("mergeUsageTrends", () => {
  it("aggregates latency with request-count weighting", () => {
    const merged = mergeUsageTrends([
      {
        date: "2026-05-07",
        requestCount: 1000,
        errorCount: 10,
        averageLatencyMs: 100,
      },
      {
        date: "2026-05-07",
        requestCount: 10,
        errorCount: 2,
        averageLatencyMs: 1000,
      },
    ]);

    expect(merged).toEqual([
      {
        date: "2026-05-07",
        requestCount: 1010,
        errorCount: 12,
        averageLatencyMs: 109,
      },
    ]);
  });

  it("sorts merged points by date", () => {
    const merged = mergeUsageTrends([
      {
        date: "2026-05-08",
        requestCount: 1,
        errorCount: 0,
        averageLatencyMs: 20,
      },
      {
        date: "2026-05-07",
        requestCount: 1,
        errorCount: 0,
        averageLatencyMs: 10,
      },
    ]);

    expect(merged.map((point) => point.date)).toEqual([
      "2026-05-07",
      "2026-05-08",
    ]);
  });
});
