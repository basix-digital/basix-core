export type RateLimitDimension = "tenant" | "app" | "token";

export interface RateLimitRule {
  dimension: RateLimitDimension;
  limit: number | null;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  dimension: RateLimitDimension;
  limit: number | null;
  remaining: number | null;
  resetAt: Date;
  retryAfterSeconds: number;
}

export interface EnforcementContext {
  tenantId: string;
  appId: string;
  apiTokenId: string;
}

export interface PlanQuotaDecision {
  allowed: boolean;
  plan: string;
  monthlyRequestLimit: number | null;
  currentMonthlyRequests: number;
  remainingRequests: number | null;
  quotaExceeded: boolean;
  warningThresholdReached: boolean;
}
