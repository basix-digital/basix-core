import { normalizePlan, planLimits } from "@basix-core/shared";
import { backendFetch, buildQuery } from "./server";
import type {
  AppRecord,
  BillingEvent,
  BillingSnapshot,
  DashboardOverview,
  Invoice,
  Subscription,
  Tenant,
  TenantMetrics,
  TenantRow,
} from "./types";
import { mergeUsageTrends } from "./usage-trends";

export async function listTenants() {
  return backendFetch<Tenant[]>("/admin/tenants");
}

export async function createTenant(payload: {
  name: string;
  slug?: string;
  plan?: string;
}) {
  return backendFetch<Tenant>("/admin/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listApps(tenantId: string) {
  return backendFetch<AppRecord[]>("/admin/apps", {
    query: { tenantId },
  });
}

export async function createApp(payload: {
  tenantId: string;
  name: string;
  slug?: string;
  baseUrl?: string;
}) {
  return backendFetch<AppRecord>("/admin/apps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createApiToken(payload: {
  appId: string;
  name?: string;
  scopes?: string[];
  expiresAt?: string;
}) {
  return backendFetch("/admin/api-tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBillingSnapshot(): Promise<BillingSnapshot> {
  const [subscriptions, invoices, events] = await Promise.all([
    backendFetch<Subscription[]>("/admin/billing/subscriptions"),
    backendFetch<Invoice[]>("/admin/billing/invoices"),
    backendFetch<BillingEvent[]>("/admin/billing/events"),
  ]);

  return { subscriptions, invoices, events };
}

export async function suspendTenant(tenantId: string) {
  return backendFetch(`/admin/billing/tenant/${tenantId}/suspend`, {
    method: "POST",
  });
}

export async function reactivateTenant(tenantId: string) {
  return backendFetch(`/admin/billing/tenant/${tenantId}/reactivate`, {
    method: "POST",
  });
}

export async function changeTenantPlan(tenantId: string, plan: string) {
  return backendFetch(`/admin/billing/tenant/${tenantId}/plan`, {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function markInvoiceAsPaid(invoiceId: string) {
  return backendFetch(`/admin/billing/invoice/${invoiceId}/pay`, {
    method: "POST",
  });
}

export async function processOverdueSubscriptions() {
  return backendFetch("/admin/billing/subscriptions/process-overdue", {
    method: "POST",
  });
}

export async function getTenantMetrics(
  tenantId: string,
  query: { from?: string; to?: string } = {},
) {
  return backendFetch<TenantMetrics>(
    `/admin/metrics/tenant/${tenantId}${buildQuery(query)}`,
  );
}

export async function getTenantRows(tenants?: Tenant[]) {
  const tenantList = tenants ?? (await listTenants());
  const metrics = await Promise.all(
    tenantList.map((tenant) => getTenantMetrics(tenant.id).catch(() => null)),
  );

  return tenantList.map<TenantRow>((tenant, index) => {
    const metric = metrics[index];
    const plan = normalizePlan(tenant.plan);
    const limit =
      metric?.plan.monthlyRequestLimit ?? planLimits[plan].monthlyRequestLimit;
    const quotaStatus = !limit
      ? "unlimited"
      : metric?.plan.quotaExceeded
        ? "exceeded"
        : metric?.plan.warningThresholdReached
          ? "warning"
          : "ok";

    return {
      ...tenant,
      currentUsage: metric?.plan.currentMonthlyRequests ?? 0,
      quotaStatus,
      quotaLimit: limit,
      errorRate: metric?.errorRate ?? 0,
    };
  });
}

export async function getAllApps(tenants?: Tenant[]) {
  const tenantList = tenants ?? (await listTenants());
  const appsByTenant = await Promise.all(
    tenantList.map((tenant) => listApps(tenant.id).catch(() => [])),
  );

  return appsByTenant.flat();
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const tenants = await listTenants();
  const [tenantRows, billing] = await Promise.all([
    getTenantRows(tenants),
    getBillingSnapshot(),
  ]);
  const metrics = await Promise.all(
    tenants.map((tenant) => getTenantMetrics(tenant.id).catch(() => null)),
  );
  const usageByDay = mergeUsageTrends(
    metrics.flatMap((metric) => metric?.usageTrend ?? []),
  );

  return {
    totals: {
      tenants: tenants.length,
      activeTenants: tenants.filter((tenant) => tenant.status === "active")
        .length,
      suspendedTenants: tenants.filter(
        (tenant) => tenant.status === "suspended",
      ).length,
      activeSubscriptions: billing.subscriptions.filter(
        (subscription) => subscription.status === "active",
      ).length,
      overdueInvoices: billing.invoices.filter((invoice) =>
        ["open", "overdue"].includes(invoice.status),
      ).length,
      monthlyRequests: tenantRows.reduce(
        (sum, tenant) => sum + tenant.currentUsage,
        0,
      ),
      quotaWarnings: tenantRows.filter((tenant) =>
        ["warning", "exceeded"].includes(tenant.quotaStatus),
      ).length,
    },
    usageByDay,
    billingEventsByType: groupBillingEvents(billing.events),
    subscriptionGrowth: buildSubscriptionGrowth(billing.subscriptions),
    tenants: tenantRows,
    billing,
  };
}

function groupBillingEvents(events: BillingEvent[]) {
  const byType = new Map<string, number>();

  for (const event of events) {
    byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
  }

  return Array.from(byType.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildSubscriptionGrowth(subscriptions: Subscription[]) {
  const byDate = new Map<string, number>();

  for (const subscription of subscriptions) {
    const date = subscription.createdAt.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + 1);
  }

  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
