"use client";

import { AlertTriangle, Gauge, KeyRound, Timer, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageAreaChart } from "@/components/dashboard/usage-area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApps, useTenantMetrics } from "@/hooks/use-console";
import {
  formatCompactNumber,
  formatLatency,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export function UsageDashboardPage() {
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const tenantSource = useApps("");
  const metrics = useTenantMetrics(tenantId);

  useEffect(() => {
    const firstTenant = tenantSource.data?.tenants[0]?.id;
    if (!tenantId && firstTenant) {
      setTenantId(firstTenant);
    }
  }, [tenantId, tenantSource.data?.tenants]);

  const retryAfter =
    metrics.data?.plan.quotaExceeded ||
    metrics.data?.plan.warningThresholdReached
      ? "Review quota"
      : "Clear";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Usage Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Request Analytics
          </h1>
        </div>
        <Select
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        >
          <option value="">Select tenant</option>
          {tenantSource.data?.tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
      </div>

      {!tenantId ? (
        <EmptyState title="No tenant selected" />
      ) : metrics.isLoading ? (
        <div className="h-96 animate-pulse rounded-lg bg-card" />
      ) : metrics.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total requests"
              value={formatCompactNumber(metrics.data.totalRequests)}
              icon={<Zap />}
            />
            <StatCard
              title="Error rate"
              value={formatPercent(metrics.data.errorRate)}
              icon={<AlertTriangle />}
              tone={metrics.data.errorRate > 0.05 ? "warning" : "default"}
            />
            <StatCard
              title="Average latency"
              value={formatLatency(metrics.data.averageLatencyMs)}
              icon={<Timer />}
              tone="accent"
            />
            <StatCard
              title="Monthly requests"
              value={formatCompactNumber(
                metrics.data.plan.currentMonthlyRequests,
              )}
              icon={<Gauge />}
            />
            <StatCard
              title="Retry-after"
              value={retryAfter}
              icon={<KeyRound />}
              tone={retryAfter === "Clear" ? "default" : "warning"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request trend</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.data.usageTrend.length ? (
                <UsageAreaChart data={metrics.data.usageTrend} />
              ) : (
                <EmptyState title="No usage events" />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top apps</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.data.topApps.map((app) => (
                      <TableRow key={app.appId ?? app.slug}>
                        <TableCell>{app.name ?? "Unknown app"}</TableCell>
                        <TableCell>{app.slug ?? "-"}</TableCell>
                        <TableCell>{formatNumber(app.requestCount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API token usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.data.topTokens.map((token) => (
                      <TableRow key={token.tokenId ?? token.prefix}>
                        <TableCell>{token.name ?? "Unknown token"}</TableCell>
                        <TableCell>{token.prefix ?? "-"}</TableCell>
                        <TableCell>
                          {formatNumber(token.requestCount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quota and rate limit posture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {metrics.data.plan.plan}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">Limit</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {metrics.data.plan.monthlyRequestLimit !== null &&
                    metrics.data.plan.monthlyRequestLimit !== undefined
                      ? formatCompactNumber(
                          metrics.data.plan.monthlyRequestLimit,
                        )
                      : "Custom"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {metrics.data.plan.remainingRequests !== null &&
                    metrics.data.plan.remainingRequests !== undefined
                      ? formatCompactNumber(metrics.data.plan.remainingRequests)
                      : "Custom"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">Quota status</p>
                  <div className="mt-3">
                    <StatusBadge
                      status={
                        metrics.data.plan.quotaExceeded
                          ? "exceeded"
                          : metrics.data.plan.warningThresholdReached
                            ? "warning"
                            : "ok"
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="Usage unavailable" />
      )}
    </div>
  );
}
