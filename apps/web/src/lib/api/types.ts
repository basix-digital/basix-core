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
  transactionalEmailProvider: "resend" | "brevo";
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

export interface TenantEnvironmentVariable {
  id: string;
  tenantId: string;
  key: string;
  description: string | null;
  status: string;
  createdBy: string | null;
  rotatedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppAuthUser {
  id: string;
  tenantId: string;
  appId: string;
  email: string;
  name: string | null;
  status: string;
  emailVerifiedAt: string | null;
  scopes: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppAuthInvitation {
  id: string;
  tenantId: string;
  appId: string;
  type: string;
  email: string;
  name: string | null;
  scopes: string[];
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
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

export interface CrmContact {
  id: string;
  tenantId: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  leadScore: number;
  assignedTo: string | null;
  tags: string[];
  lastContactAt: string | null;
  createdAt: string;
  pipeline?: { id: string; name: string; key: string } | null;
  stage?: { id: string; name: string; key: string } | null;
}

export interface AiChannel {
  id: string;
  tenantId: string;
  displayName: string;
  phoneNumber: string;
  agentIdDefault: string;
  provider: string;
  status: string;
  rateLimitPerMinute: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversation {
  id: string;
  tenantId: string;
  channelId: string;
  phoneNumber: string;
  agentId: string;
  mode: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  channel?: Pick<AiChannel, "id" | "displayName" | "phoneNumber">;
  crmContact?: Pick<
    CrmContact,
    "id" | "fullName" | "phone" | "status" | "leadScore"
  > | null;
}

export interface AiQueueMessage {
  id: string;
  tenantId: string;
  channelId: string;
  conversationId: string | null;
  crmContactId: string | null;
  messageId: string | null;
  phoneNumber: string;
  toNumber: string | null;
  agentId: string;
  threadId: string;
  incomingMessage: string;
  normalizedInput: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  response: string | null;
  error: string | null;
  createdAt: string;
  processAfter: string;
  processedAt: string | null;
  channel?: Pick<AiChannel, "id" | "displayName" | "phoneNumber">;
  crmContact?: Pick<CrmContact, "id" | "fullName" | "phone"> | null;
}

export interface AiAgentLlmSettings {
  id: string;
  tenantId: string;
  agentId: string;
  provider: string;
  model: string | null;
  systemPrompt: string;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentRecord {
  id: string;
  name: string;
  description: string;
  settings: AiAgentLlmSettings | null;
}

export interface AiPlaybookRecord {
  id: string;
  tenantId: string;
  title: string;
  type: string;
  category: string;
  status: string;
  currentVersionId: string | null;
  performanceScore: number;
  usageCount: number;
  versions?: AiPlaybookVersion[];
  assignments?: AiAgentPlaybookAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface AiPlaybookVersion {
  id: string;
  tenantId: string;
  playbookId: string;
  version: number;
  type: string;
  category: string;
  stage: string;
  title: string;
  triggerPhrases: string[];
  situation: string;
  responseStrategy: string;
  exampleResponse: string;
  rationale: string;
  nextStep: string;
  priority: number;
  tags: string[];
  minScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentPlaybookAssignment {
  id: string;
  tenantId: string;
  agentId: string;
  playbookId: string;
  playbookVersionId: string;
  isEnabled: boolean;
  isActive: boolean;
  priorityOverride: number | null;
  minScoreOverride: number | null;
  activatedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  channelType: "whatsapp" | "email";
  provider: "brevo" | "twilio" | "sent_dm";
  providerTemplateId: string | null;
  subject: string | null;
  body: string;
  variables: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiCampaign {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;
  channelType: "whatsapp" | "email";
  status: string;
  audienceFilter: unknown;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  template?: AiMessageTemplate;
  _count?: { recipients: number };
}

export interface CrmPipeline {
  id: string;
  name: string;
  key: string;
  stages: Array<{ id: string; name: string; key: string; probability: number }>;
}

export interface CrmActivity {
  id: string;
  type: string;
  title: string;
  body: string | null;
  direction: string | null;
  occurredAt: string;
  contact?: Pick<CrmContact, "id" | "fullName" | "phone"> | null;
}

export interface AiPlatformMetrics {
  tenantId: string;
  contacts: number;
  channels: number;
  conversations: number;
  humanConversations: number;
  queuedMessages: number;
  failedMessages: number;
  playbooks: number;
  plan: PlanReport;
}

export interface AiPlatformSnapshot {
  metrics: AiPlatformMetrics;
  contacts: CrmContact[];
  channels: AiChannel[];
  chats: AiConversation[];
  agents: AiAgentRecord[];
  playbooks: AiPlaybookRecord[];
  pipelines: CrmPipeline[];
  activities: CrmActivity[];
}
