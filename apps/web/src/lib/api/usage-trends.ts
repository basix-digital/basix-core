import type { UsageTrendPoint } from "./types";

interface UsageTrendAccumulator {
  date: string;
  requestCount: number;
  errorCount: number;
  latencyRequestMs: number;
}

export function mergeUsageTrends(points: UsageTrendPoint[]) {
  const byDate = new Map<string, UsageTrendAccumulator>();

  for (const point of points) {
    const existing = byDate.get(point.date) ?? {
      date: point.date,
      requestCount: 0,
      errorCount: 0,
      latencyRequestMs: 0,
    };

    byDate.set(point.date, {
      date: point.date,
      requestCount: existing.requestCount + point.requestCount,
      errorCount: existing.errorCount + point.errorCount,
      latencyRequestMs:
        existing.latencyRequestMs + point.averageLatencyMs * point.requestCount,
    });
  }

  return Array.from(byDate.values())
    .map((point) => ({
      date: point.date,
      requestCount: point.requestCount,
      errorCount: point.errorCount,
      averageLatencyMs:
        point.requestCount > 0
          ? Math.round(point.latencyRequestMs / point.requestCount)
          : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
