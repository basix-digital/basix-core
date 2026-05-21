import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

const mockUseApps = jest.fn();
const mockUseApiTokens = jest.fn();
const mockUseCreateApp = jest.fn();
const mockUseUpdateApp = jest.fn();
const mockUseCreateApiToken = jest.fn();
const mockUseRevokeApiToken = jest.fn();
const mockUseTenantMetrics = jest.fn();

jest.mock("@/hooks/use-console", () => ({
  useApps: mockUseApps,
  useApiTokens: mockUseApiTokens,
  useCreateApp: mockUseCreateApp,
  useUpdateApp: mockUseUpdateApp,
  useCreateApiToken: mockUseCreateApiToken,
  useRevokeApiToken: mockUseRevokeApiToken,
  useTenantMetrics: mockUseTenantMetrics,
}));

const { AppManagementPage } =
  require("@/components/apps/app-management-page") as typeof import("@/components/apps/app-management-page");

describe("AppManagementPage", () => {
  it("renders editable apps and API token metadata", () => {
    mockUseApps.mockReturnValue({
      isLoading: false,
      data: {
        tenants: [{ id: "tenant-1", name: "Acme", slug: "acme" }],
        data: [
          {
            id: "app-1",
            tenantId: "tenant-1",
            name: "Portal",
            slug: "portal",
            baseUrl: "https://portal.example.com",
            status: "active",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
        apiTokens: [],
      },
    });
    mockUseApiTokens.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "token-1",
          tenantId: "tenant-1",
          appId: "app-1",
          name: "Portal token",
          prefix: "abc123",
          scopes: ["read:usage"],
          status: "active",
          lastUsedAt: null,
          expiresAt: null,
          revokedAt: null,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    });
    mockUseCreateApp.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseUpdateApp.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseCreateApiToken.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseRevokeApiToken.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockUseTenantMetrics.mockReturnValue({ data: { topApps: [] } });

    render(<AppManagementPage />);

    expect(screen.getByText("Apps and API Tokens")).toBeInTheDocument();
    expect(screen.getAllByText("Portal").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /edit/i })).toBeEnabled();
    expect(screen.getByText("API tokens by tenant")).toBeInTheDocument();
    expect(screen.getByText("Portal token")).toBeInTheDocument();
    expect(screen.getByText("prefix: abc123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revoke/i })).toBeEnabled();
  });
});
