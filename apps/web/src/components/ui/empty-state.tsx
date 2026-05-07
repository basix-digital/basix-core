import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/45 p-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? (
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      ) : null}
    </div>
  );
}
