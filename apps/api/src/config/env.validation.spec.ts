import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  const validEnv = {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/basix_core",
    JWT_ACCESS_SECRET: "test-secret",
  };

  it("requires JWT_ACCESS_SECRET", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: validEnv.DATABASE_URL,
      }),
    ).toThrow("JWT_ACCESS_SECRET");
  });

  it("applies safe defaults for optional API config", () => {
    expect(validateEnv(validEnv)).toEqual(
      expect.objectContaining({
        NODE_ENV: "development",
        PORT: 3000,
        JWT_ACCESS_EXPIRES_IN: "15m",
        RESEND_BASE_URL: "https://api.resend.com",
        BREVO_BASE_URL: "https://api.brevo.com/v3",
        API_TOKEN_LAST_USED_TOUCH_INTERVAL_MS: 300000,
      }),
    );
  });
});
