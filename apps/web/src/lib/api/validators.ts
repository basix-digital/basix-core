import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional()
    .or(z.literal("")),
  plan: z.enum(["starter", "pro", "enterprise", "internal"]).optional(),
});

export const tenantListQuerySchema = z.object({
  search: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  plan: z.string().optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().min(5).max(50).optional().default(10),
});

export const createAppSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional()
    .or(z.literal("")),
  baseUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const updateAppSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  baseUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "disabled"]).optional(),
});

export const createApiTokenSchema = z.object({
  appId: z.string().uuid(),
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  scopes: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9:._-]+$/),
    )
    .max(50)
    .optional()
    .default([]),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
});

const appAuthScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9:._-]+$/);

export const createAppInvitationSchema = z.object({
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  scopes: z.array(appAuthScopeSchema).max(50).optional().default(["user"]),
});

export const updateAppUserSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(["pending", "active", "disabled"]).optional(),
  scopes: z.array(appAuthScopeSchema).max(50).optional(),
});

export const metricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
