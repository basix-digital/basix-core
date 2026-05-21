import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

const mockUseEnvironmentVariables = jest.fn();
const mockUseCreateEnvironmentVariable = jest.fn();
const mockUseRotateEnvironmentVariable = jest.fn();
const mockUseRevokeEnvironmentVariable = jest.fn();

jest.mock("@/hooks/use-console", () => ({
  useEnvironmentVariables: mockUseEnvironmentVariables,
  useCreateEnvironmentVariable: mockUseCreateEnvironmentVariable,
  useRotateEnvironmentVariable: mockUseRotateEnvironmentVariable,
  useRevokeEnvironmentVariable: mockUseRevokeEnvironmentVariable,
}));

const { EnvironmentVariablesPage } =
  require("@/components/environment-variables/environment-variables-page") as typeof import("@/components/environment-variables/environment-variables-page");

describe("EnvironmentVariablesPage", () => {
  it("renders masked tenant environment variables and actions", () => {
    mockUseEnvironmentVariables.mockReturnValue({
      isLoading: false,
      data: {
        tenants: [{ id: "tenant-1", name: "Acme", slug: "acme" }],
        data: [
          {
            id: "variable-1",
            tenantId: "tenant-1",
            key: "OPENROUTER_API_KEY",
            description: "LLM routing",
            status: "active",
            createdBy: "user-id",
            rotatedAt: null,
            revokedAt: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
        ],
      },
    });
    mockUseCreateEnvironmentVariable.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseRotateEnvironmentVariable.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockUseRevokeEnvironmentVariable.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    render(<EnvironmentVariablesPage />);

    expect(screen.getByText("Environment Variables")).toBeInTheDocument();
    expect(screen.getByText("OPENROUTER_API_KEY")).toBeInTheDocument();
    expect(screen.getByText("LLM routing")).toBeInTheDocument();
    expect(screen.getByText("********")).toBeInTheDocument();
    expect(screen.queryByText("secret-value")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /revoke/i })).toBeEnabled();
  });
});
