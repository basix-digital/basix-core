import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockConsoleFetch = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams("next=/dashboard/usage"),
}));

jest.mock("@/lib/api/client", () => ({
  consoleFetch: mockConsoleFetch,
}));

const { LoginForm } =
  require("@/components/auth/login-form") as typeof import("@/components/auth/login-form");

describe("LoginForm", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockRefresh.mockReset();
    mockConsoleFetch.mockReset();
  });

  it("submits credentials through the secure auth route and redirects", async () => {
    mockConsoleFetch.mockResolvedValue({
      user: { email: "admin@basix.local" },
    });
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "admin@basix.local");
    await user.type(screen.getByLabelText(/password/i), "admin123456");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockConsoleFetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@basix.local",
          password: "admin123456",
        }),
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("/dashboard/usage");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders backend authentication errors", async () => {
    mockConsoleFetch.mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "admin@basix.local");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
