"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Array<{ value: string; label: string; icon?: ReactNode }>;
}

export function Tabs({ value, onValueChange, tabs }: TabsProps) {
  return (
    <div className="inline-flex h-9 rounded-md border border-border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded px-3 text-sm font-medium text-muted-foreground transition-colors",
            value === tab.value && "bg-secondary text-foreground",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
