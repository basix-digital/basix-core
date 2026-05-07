import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

const mockUseApps = jest.fn();
const mockUseTenantMetrics = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tenantId=tenant-1"),
}));

jest.mock("@/hooks/use-console", () => ({
  useApps: mockUseApps,
  useTenantMetrics: mockUseTenantMetrics,
}));

const { UsageDashboardPage } =
  require("@/components/usage/usage-dashboard-page") as typeof import("@/components/usage/usage-dashboard-page");

describe("UsageDashboardPage", () => {
  it("renders zero remaining quota instead of Custom", () => {
    mockUseApps.mockReturnValue({
      data: {
        tenants: [
          {
            id: "tenant-1",
            name: "Acme Cloud",
          },
        ],
      },
    });
    mockUseTenantMetrics.mockReturnValue({
      isLoading: false,
      data: {
        tenantId: "tenant-1",
        range: {
          from: "2026-05-01T00:00:00.000Z",
          to: "2026-05-07T00:00:00.000Z",
        },
        totalRequests: 10000,
        errorRate: 0,
        averageLatencyMs: 80,
        topApps: [],
        topTokens: [],
        usageTrend: [],
        plan: {
          plan: "Starter",
          monthlyRequestLimit: 10000,
          currentMonthlyRequests: 10000,
          remainingRequests: 0,
          quotaExceeded: true,
          warningThresholdReached: true,
          warningThreshold: 0.8,
        },
      },
    });

    render(<UsageDashboardPage />);

    const remainingCard = screen.getByText("Remaining").closest("div");

    expect(remainingCard).toHaveTextContent("0");
    expect(remainingCard).not.toHaveTextContent("Custom");
  });
});
