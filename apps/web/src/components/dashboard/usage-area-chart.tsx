"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageTrendPoint } from "@/lib/api/types";
import { formatCompactNumber, formatDate } from "@/lib/format";

export function UsageAreaChart({ data }: { data: UsageTrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.36}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value: string) =>
              formatDate(value).replace(", 202", ", 2")
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--foreground))",
            }}
          />
          <Area
            type="monotone"
            dataKey="requestCount"
            stroke="hsl(var(--primary))"
            fill="url(#requestFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
