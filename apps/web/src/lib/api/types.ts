export interface ApiEnvelopeError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface AuthResponse {
  accessToken: string;
  sessionValue: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTokenRecord {
  id: string;
  tenantId: string;
  appId: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  token?: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  canceledAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Pick<Tenant, "id" | "name" | "slug">;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  status: string;
  amountCents: number;
  currency: string;
  dueAt: string;
  paidAt: string | null;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Pick<Tenant, "id" | "name" | "slug">;
}

export interface BillingEvent {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  actorUserId: string | null;
  type: string;
  metadata: unknown;
  createdAt: string;
}

export interface PlanReport {
  plan: string;
  monthlyRequestLimit: number | null;
  currentMonthlyRequests: number;
  remainingRequests: number | null;
  quotaExceeded: boolean;
  warningThresholdReached: boolean;
  warningThreshold: number;
}

export interface UsageTrendPoint {
  date: string;
  requestCount: number;
  errorCount: number;
  averageLatencyMs: number;
}

export interface TopAppUsage {
  appId: string | null;
  name: string | null;
  slug: string | null;
  requestCount: number;
}

export interface TopTokenUsage {
  tokenId: string | null;
  appId: string | null;
  name: string | null;
  prefix: string | null;
  requestCount: number;
}

export interface TenantMetrics {
  tenantId: string;
  range: {
    from: string;
    to: string;
  };
  totalRequests: number;
  errorRate: number;
  averageLatencyMs: number;
  topApps: TopAppUsage[];
  topTokens: TopTokenUsage[];
  usageTrend: UsageTrendPoint[];
  plan: PlanReport;
}

export interface TenantRow extends Tenant {
  currentUsage: number;
  quotaStatus: "ok" | "warning" | "exceeded" | "unlimited";
  quotaLimit: number | null;
  errorRate: number;
}

export interface BillingSnapshot {
  subscriptions: Subscription[];
  invoices: Invoice[];
  events: BillingEvent[];
}

export interface DashboardOverview {
  totals: {
    tenants: number;
    activeTenants: number;
    suspendedTenants: number;
    activeSubscriptions: number;
    overdueInvoices: number;
    monthlyRequests: number;
    quotaWarnings: number;
  };
  usageByDay: UsageTrendPoint[];
  billingEventsByType: Array<{ type: string; count: number }>;
  subscriptionGrowth: Array<{ date: string; count: number }>;
  tenants: TenantRow[];
  billing: BillingSnapshot;
}
