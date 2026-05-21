import { normalizePlan, planLimits } from "@basix-core/shared";
import { backendFetch, buildQuery } from "./server";
import type {
  ApiTokenRecord,
  AppRecord,
  BillingEvent,
  BillingSnapshot,
  DashboardOverview,
  Invoice,
  Subscription,
  Tenant,
  TenantMetrics,
  TenantRow,
  AiPlatformSnapshot,
  AiQueueMessage,
  AiCampaign,
  AiChannel,
  AiMessageTemplate,
  AiPlaybookRecord,
  AppAuthInvitation,
  AppAuthUser,
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

export async function updateApp(
  id: string,
  payload: {
    name?: string;
    slug?: string;
    baseUrl?: string | null;
    status?: "active" | "disabled";
  },
) {
  return backendFetch<AppRecord>(`/admin/apps/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listApiTokens(query: {
  tenantId: string;
  appId?: string;
  status?: string;
}) {
  return backendFetch<ApiTokenRecord[]>("/admin/api-tokens", { query });
}

export async function createApiToken(payload: {
  appId: string;
  name?: string;
  scopes?: string[];
  expiresAt?: string;
}) {
  return backendFetch<ApiTokenRecord>("/admin/api-tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeApiToken(apiTokenId: string) {
  return backendFetch<ApiTokenRecord>("/admin/api-tokens/revoke", {
    method: "POST",
    body: JSON.stringify({ apiTokenId }),
  });
}

export async function listAppAuthUsers(query: {
  tenantId: string;
  appId?: string;
  status?: string;
  search?: string;
}) {
  return backendFetch<AppAuthUser[]>("/admin/app-auth/users", { query });
}

export async function updateAppAuthUser(
  id: string,
  payload: {
    name?: string;
    status?: "pending" | "active" | "disabled";
    scopes?: string[];
  },
) {
  return backendFetch<AppAuthUser>(`/admin/app-auth/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAppAuthInvitations(query: {
  tenantId: string;
  appId?: string;
  status?: string;
}) {
  return backendFetch<AppAuthInvitation[]>("/admin/app-auth/invitations", {
    query,
  });
}

export async function createAppAuthInvitation(payload: {
  tenantId: string;
  appId: string;
  email: string;
  name?: string;
  scopes?: string[];
}) {
  return backendFetch<AppAuthInvitation>("/admin/app-auth/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendAppAuthInvitation(id: string) {
  return backendFetch<AppAuthInvitation>(
    `/admin/app-auth/invitations/${id}/resend`,
    { method: "POST" },
  );
}

export async function revokeAppAuthInvitation(id: string) {
  return backendFetch<AppAuthInvitation>(
    `/admin/app-auth/invitations/${id}/revoke`,
    { method: "POST" },
  );
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

export async function getAiPlatformSnapshot(
  tenantId: string,
): Promise<AiPlatformSnapshot> {
  const query = { tenantId };
  const [
    metrics,
    contacts,
    channels,
    chats,
    agents,
    playbooks,
    pipelines,
    activities,
  ] = await Promise.all([
    backendFetch<AiPlatformSnapshot["metrics"]>("/metrics", { query }),
    backendFetch<{ data: AiPlatformSnapshot["contacts"]; total: number }>(
      "/crm/contacts",
      {
        query: { ...query, limit: 8 },
      },
    ),
    backendFetch<AiPlatformSnapshot["channels"]>("/channels", { query }),
    backendFetch<{ data: AiPlatformSnapshot["chats"]; total: number }>(
      "/chats",
      {
        query: { ...query, limit: 8 },
      },
    ),
    backendFetch<AiPlatformSnapshot["agents"]>("/agents", { query }),
    backendFetch<AiPlatformSnapshot["playbooks"]>("/playbooks", { query }),
    backendFetch<AiPlatformSnapshot["pipelines"]>("/crm/pipelines", { query }),
    backendFetch<AiPlatformSnapshot["activities"]>("/crm/activities", {
      query: { ...query, limit: 8 },
    }),
  ]);

  return {
    metrics,
    contacts: contacts.data,
    channels,
    chats: chats.data,
    agents,
    playbooks,
    pipelines,
    activities,
  };
}

export async function listAiContacts(tenantId: string, limit = 50) {
  return backendFetch<{ data: AiPlatformSnapshot["contacts"]; total: number }>(
    "/crm/contacts",
    { query: { tenantId, limit } },
  );
}

export async function listAiChats(tenantId: string, limit = 50) {
  return backendFetch<{ data: AiPlatformSnapshot["chats"]; total: number }>(
    "/chats",
    { query: { tenantId, limit } },
  );
}

export async function listAiChannels(tenantId: string) {
  return backendFetch<AiPlatformSnapshot["channels"]>("/channels", {
    query: { tenantId },
  });
}

export async function createAiChannel(payload: {
  tenantId: string;
  displayName: string;
  phoneNumber: string;
  agentIdDefault: string;
  provider?: string;
  rateLimitPerMinute?: number;
}) {
  return backendFetch<AiChannel>("/channels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAiChannel(
  id: string,
  payload: {
    tenantId: string;
    displayName?: string;
    phoneNumber?: string;
    agentIdDefault?: string;
    provider?: string;
    status?: string;
    rateLimitPerMinute?: number;
  },
) {
  return backendFetch<AiChannel>(`/channels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAiAgents(tenantId: string) {
  return backendFetch<AiPlatformSnapshot["agents"]>("/agents", {
    query: { tenantId },
  });
}

export async function updateAiAgentSettings(
  agentId: string,
  payload: {
    tenantId: string;
    provider?: string;
    model?: string;
    systemPrompt: string;
    temperature?: number;
    topP?: number;
    topK?: number;
  },
) {
  return backendFetch(`/agents/${agentId}/llm-settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAiPlaybooks(tenantId: string) {
  return backendFetch<AiPlatformSnapshot["playbooks"]>("/playbooks", {
    query: { tenantId },
  });
}

export async function createAiPlaybook(payload: {
  tenantId: string;
  title: string;
  type: string;
  category: string;
  stage: string;
  triggerPhrases?: string[];
  situation: string;
  responseStrategy: string;
  exampleResponse: string;
  rationale: string;
  nextStep: string;
  priority?: number;
  tags?: string[];
  minScore?: number;
}) {
  return backendFetch<AiPlaybookRecord>("/playbooks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAiPlaybook(
  id: string,
  payload: {
    tenantId: string;
    title?: string;
    type?: string;
    category?: string;
    status?: string;
    stage?: string;
    triggerPhrases?: string[];
    situation?: string;
    responseStrategy?: string;
    exampleResponse?: string;
    rationale?: string;
    nextStep?: string;
    priority?: number;
    tags?: string[];
    minScore?: number;
  },
) {
  return backendFetch<AiPlaybookRecord>(`/playbooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function assignAiPlaybook(
  playbookId: string,
  payload: {
    tenantId: string;
    agentId: string;
    playbookVersionId?: string;
    isEnabled?: boolean;
    isActive?: boolean;
    priorityOverride?: number;
    minScoreOverride?: number;
  },
) {
  return backendFetch(`/playbooks/${playbookId}/assignments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function takeoverAiChat(
  phone: string,
  payload: { tenantId: string; channelId?: string },
) {
  return backendFetch(`/chats/${encodeURIComponent(phone)}/takeover`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function releaseAiChat(
  phone: string,
  payload: { tenantId: string; channelId?: string },
) {
  return backendFetch(`/chats/${encodeURIComponent(phone)}/release`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendAiChatMessage(
  phone: string,
  payload: { tenantId: string; channelId?: string; body: string },
) {
  return backendFetch(`/chats/${encodeURIComponent(phone)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listAiQueue(tenantId: string, limit = 50) {
  return backendFetch<{ data: AiQueueMessage[]; total: number }>("/queue", {
    query: { tenantId, limit },
  });
}

export async function listAiActivities(tenantId: string, limit = 50) {
  return backendFetch<AiPlatformSnapshot["activities"]>("/crm/activities", {
    query: { tenantId, limit },
  });
}

export async function listAiMessageTemplates(tenantId: string) {
  return backendFetch<AiMessageTemplate[]>("/messaging/templates", {
    query: { tenantId },
  });
}

export async function createAiMessageTemplate(payload: {
  tenantId: string;
  name: string;
  channelType: "whatsapp" | "email";
  provider?: "brevo" | "twilio";
  providerTemplateId?: string;
  subject?: string;
  body: string;
  variables?: string[];
}) {
  return backendFetch<AiMessageTemplate>("/messaging/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAiMessageTemplate(
  id: string,
  payload: {
    tenantId: string;
    name?: string;
    provider?: "brevo" | "twilio";
    providerTemplateId?: string;
    subject?: string;
    body?: string;
    variables?: string[];
    status?: string;
  },
) {
  return backendFetch<AiMessageTemplate>(`/messaging/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAiCampaigns(tenantId: string, limit = 50) {
  return backendFetch<{ data: AiCampaign[]; total: number }>(
    "/messaging/campaigns",
    {
      query: { tenantId, limit },
    },
  );
}

export async function createAiCampaign(payload: {
  tenantId: string;
  templateId: string;
  name: string;
  channelType?: "whatsapp" | "email";
  channelId?: string;
  contactIds?: string[];
  audienceStatus?: string;
  variables?: Record<string, unknown>;
  scheduledAt?: string;
}) {
  return backendFetch<AiCampaign>("/messaging/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendAiNotification(payload: {
  tenantId: string;
  templateId: string;
  channelId?: string;
  contactId?: string;
  phoneNumber?: string;
  email?: string;
  variables?: Record<string, unknown>;
}) {
  return backendFetch<AiCampaign>("/messaging/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
