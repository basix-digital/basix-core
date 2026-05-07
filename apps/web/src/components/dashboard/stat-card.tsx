import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: "default" | "warning" | "danger" | "accent";
}) {
  const toneClass = {
    default: "text-primary bg-primary/12 border-primary/25",
    warning: "text-amber-300 bg-amber-400/10 border-amber-400/25",
    danger: "text-red-300 bg-red-400/10 border-red-400/25",
    accent: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
  }[tone];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md border",
            toneClass,
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-normal text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
