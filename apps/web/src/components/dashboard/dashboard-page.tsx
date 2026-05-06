"use client";

import {
  AlertTriangle,
  Building2,
  CreditCard,
  Gauge,
  Receipt,
  Server,
  ShieldAlert,
} from "lucide-react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageAreaChart } from "@/components/dashboard/usage-area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardOverview } from "@/hooks/use-console";
import { formatCompactNumber, formatDate, formatNumber } from "@/lib/format";

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardOverview();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <EmptyState title="Dashboard unavailable" />;
  }

  const eventData = data.billingEventsByType.map((event) => ({
    name: event.type.replace(/_/g, " "),
    value: event.count,
  }));
  const growthData = data.subscriptionGrowth.map((point) => ({
    name: formatDate(point.date).split(",")[0],
    value: point.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Admin Console</p>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Control Plane Overview
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total tenants"
          value={formatNumber(data.totals.tenants)}
          icon={<Building2 />}
        />
        <StatCard
          title="Active tenants"
          value={formatNumber(data.totals.activeTenants)}
          icon={<Server />}
          tone="accent"
        />
        <StatCard
          title="Suspended tenants"
          value={formatNumber(data.totals.suspendedTenants)}
          icon={<ShieldAlert />}
          tone={data.totals.suspendedTenants > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Active subscriptions"
          value={formatNumber(data.totals.activeSubscriptions)}
          icon={<CreditCard />}
        />
        <StatCard
          title="Overdue invoices"
          value={formatNumber(data.totals.overdueInvoices)}
          icon={<Receipt />}
          tone={data.totals.overdueInvoices > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Monthly requests"
          value={formatCompactNumber(data.totals.monthlyRequests)}
          icon={<Gauge />}
          tone="accent"
        />
        <StatCard
          title="Quota warnings"
          value={formatNumber(data.totals.quotaWarnings)}
          icon={<AlertTriangle />}
          tone={data.totals.quotaWarnings > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Usage requests by day</CardTitle>
          </CardHeader>
          <CardContent>
            {data.usageByDay.length ? (
              <UsageAreaChart data={data.usageByDay} />
            ) : (
              <EmptyState title="No request activity" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing events by type</CardTitle>
          </CardHeader>
          <CardContent>
            {eventData.length ? (
              <BarChart data={eventData} />
            ) : (
              <EmptyState title="No billing events" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subscription growth</CardTitle>
          </CardHeader>
          <CardContent>
            {growthData.length ? (
              <BarChart data={growthData} color="hsl(var(--primary))" />
            ) : (
              <EmptyState title="No subscription history" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenant risk queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tenants.slice(0, 6).map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {tenant.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tenant.slug}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {tenant.plan ?? "starter"}
                    </TableCell>
                    <TableCell>
                      {formatCompactNumber(tenant.currentUsage)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tenant.quotaStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-72 animate-pulse rounded-md bg-secondary" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-card" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-lg bg-card" />
        <div className="h-96 animate-pulse rounded-lg bg-card" />
      </div>
    </div>
  );
}
