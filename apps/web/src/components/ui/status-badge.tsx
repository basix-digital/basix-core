import { Badge, type BadgeProps } from "@/components/ui/badge";

const variantByStatus: Record<string, BadgeProps["variant"]> = {
  active: "default",
  trialing: "accent",
  paid: "default",
  ok: "default",
  open: "warning",
  overdue: "warning",
  past_due: "warning",
  warning: "warning",
  suspended: "danger",
  canceled: "danger",
  revoked: "danger",
  disabled: "neutral",
  expired: "neutral",
  exceeded: "danger",
  inactive: "neutral",
  draft: "neutral",
  unlimited: "accent",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const safeStatus = status ?? "unknown";

  return (
    <Badge variant={variantByStatus[safeStatus] ?? "neutral"}>
      {safeStatus.replace(/_/g, " ")}
    </Badge>
  );
}
