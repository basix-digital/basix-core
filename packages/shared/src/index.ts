import { z } from "zod";

export const tenantStatuses = ["active", "suspended"] as const;
export const appStatuses = ["active", "inactive", "suspended"] as const;
export const tokenStatuses = ["active", "revoked"] as const;
export const billingStatuses = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "canceled",
] as const;
export const invoiceStatuses = [
  "draft",
  "open",
  "paid",
  "void",
  "overdue",
] as const;
export const planKeys = ["starter", "pro", "enterprise", "internal"] as const;

export type TenantStatus = (typeof tenantStatuses)[number];
export type AppStatus = (typeof appStatuses)[number];
export type TokenStatus = (typeof tokenStatuses)[number];
export type BillingStatus = (typeof billingStatuses)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type PlanKey = (typeof planKeys)[number];

export const planLimits: Record<
  PlanKey,
  {
    label: string;
    monthlyRequestLimit: number | null;
    warningThreshold: number;
  }
> = {
  starter: {
    label: "Starter",
    monthlyRequestLimit: 10_000,
    warningThreshold: 0.8,
  },
  pro: {
    label: "Pro",
    monthlyRequestLimit: 100_000,
    warningThreshold: 0.8,
  },
  enterprise: {
    label: "Enterprise",
    monthlyRequestLimit: null,
    warningThreshold: 0.8,
  },
  internal: {
    label: "Internal",
    monthlyRequestLimit: null,
    warningThreshold: 0.8,
  },
};

export const tenantStatusSchema = z.enum(tenantStatuses);
export const planKeySchema = z.enum(planKeys);

export function normalizePlan(plan: string | null | undefined): PlanKey {
  const normalized = (plan ?? "starter").toLowerCase();
  return planKeys.includes(normalized as PlanKey)
    ? (normalized as PlanKey)
    : "starter";
}
