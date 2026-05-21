import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import type { AppAuthInvitation, AppAuthUser } from "@/lib/api/types";

const mockUseApps = jest.fn();
const mockUseAppAuthUsers = jest.fn();
const mockUseAppAuthInvitations = jest.fn();
const mockUseCreateAppAuthInvitation = jest.fn();
const mockUseAppAuthInvitationAction = jest.fn();
const mockUseUpdateAppAuthUser = jest.fn();

jest.mock("@/hooks/use-console", () => ({
  useApps: mockUseApps,
  useAppAuthUsers: mockUseAppAuthUsers,
  useAppAuthInvitations: mockUseAppAuthInvitations,
  useCreateAppAuthInvitation: mockUseCreateAppAuthInvitation,
  useAppAuthInvitationAction: mockUseAppAuthInvitationAction,
  useUpdateAppAuthUser: mockUseUpdateAppAuthUser,
}));

const { AppAuthPage } =
  require("@/components/app-auth/app-auth-page") as typeof import("@/components/app-auth/app-auth-page");

const users: AppAuthUser[] = [
  {
    id: "user-1",
    tenantId: "tenant-1",
    appId: "app-1",
    email: "user@example.com",
    name: "Portal User",
    status: "active",
    emailVerifiedAt: "2026-05-01T00:00:00.000Z",
    scopes: ["crm:read", "messages:write"],
    lastLoginAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  },
];

const invitations: AppAuthInvitation[] = [
  {
    id: "invite-1",
    tenantId: "tenant-1",
    appId: "app-1",
    type: "invite",
    email: "pending@example.com",
    name: "Pending User",
    scopes: ["user"],
    expiresAt: "2026-06-01T00:00:00.000Z",
    consumedAt: null,
    revokedAt: null,
    createdByUserId: "admin-1",
    createdAt: "2026-05-01T00:00:00.000Z",
  },
];

describe("AppAuthPage", () => {
  it("renders users, invitations and invite controls", async () => {
    mockUseApps.mockReturnValue({
      data: {
        tenants: [{ id: "tenant-1", name: "Acme", slug: "acme" }],
        data: [{ id: "app-1", name: "Portal", tenantId: "tenant-1" }],
      },
    });
    mockUseAppAuthUsers.mockReturnValue({
      isLoading: false,
      data: users,
    });
    mockUseAppAuthInvitations.mockReturnValue({
      isLoading: false,
      data: invitations,
    });
    mockUseCreateAppAuthInvitation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseAppAuthInvitationAction.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockUseUpdateAppAuthUser.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    render(<AppAuthPage />);

    expect(screen.getByText("Users and Invitations")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Portal User")).toBeInTheDocument();
    expect(screen.getByText("crm:read, messages:write")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /send invitation/i }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: /resend/i })).toBeEnabled();
  });
});
