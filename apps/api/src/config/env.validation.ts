import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
    OBSERVABILITY_HASH_SECRET: z.string().min(1).optional(),
    API_TOKEN_LAST_USED_TOUCH_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 60 * 1000),
  })
  .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  return result.data;
}
