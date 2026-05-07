import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import type { DashboardOverview } from "@/lib/api/types";

const mockUseDashboardOverview = jest.fn();

jest.mock("@/hooks/use-console", () => ({
  useDashboardOverview: mockUseDashboardOverview,
}));

jest.mock("@/components/dashboard/usage-area-chart", () => ({
  UsageAreaChart: () =>
    require("react").createElement("div", {
      "data-testid": "usage-area-chart",
    }),
}));

jest.mock("@/components/dashboard/bar-chart", () => ({
  BarChart: () =>
    require("react").createElement("div", {
      "data-testid": "bar-chart",
    }),
}));

const { DashboardPage } =
  require("@/components/dashboard/dashboard-page") as typeof import("@/components/dashboard/dashboard-page");

const dashboardOverview: DashboardOverview = {
  totals: {
    tenants: 3,
    activeTenants: 2,
    suspendedTenants: 1,
    activeSubscriptions: 2,
    overdueInvoices: 1,
    monthlyRequests: 12500,
    quotaWarnings: 1,
  },
  usageByDay: [
    {
      date: "2026-05-07",
      requestCount: 12500,
      errorCount: 42,
      averageLatencyMs: 91,
    },
  ],
  billingEventsByType: [{ type: "invoice_paid", count: 4 }],
  subscriptionGrowth: [{ date: "2026-05-07", count: 2 }],
  tenants: [
    {
      id: "tenant-1",
      name: "Acme Cloud",
      slug: "acme-cloud",
      status: "active",
      plan: "pro",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
      currentUsage: 8400,
      quotaStatus: "warning",
      quotaLimit: 10000,
      errorRate: 0.01,
    },
  ],
  billing: {
    subscriptions: [],
    invoices: [],
    events: [],
  },
};

describe("DashboardPage", () => {
  it("renders overview metrics and tenant risk data", () => {
    mockUseDashboardOverview.mockReturnValue({
      data: dashboardOverview,
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText("Control Plane Overview")).toBeInTheDocument();
    expect(screen.getByText("Total tenants")).toBeInTheDocument();
    expect(screen.getByText("Monthly requests")).toBeInTheDocument();
    expect(screen.getByText("12.5K")).toBeInTheDocument();
    expect(screen.getByText("Acme Cloud")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByTestId("usage-area-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(2);
  });

  it("shows an unavailable state when the dashboard query fails", () => {
    mockUseDashboardOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("failed"),
    });

    render(<DashboardPage />);

    expect(screen.getByText("Dashboard unavailable")).toBeInTheDocument();
  });
});
