import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge", () => {
  it("renders normalized status text", () => {
    render(<StatusBadge status="past_due" />);

    expect(screen.getByText("past due")).toBeInTheDocument();
  });

  it("falls back to unknown when status is not provided", () => {
    render(<StatusBadge status={null} />);

    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
