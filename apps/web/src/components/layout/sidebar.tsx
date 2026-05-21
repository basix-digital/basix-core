"use client";

import {
  Activity,
  AppWindow,
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Shield,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/apps", label: "Apps", icon: AppWindow },
  { href: "/dashboard/app-auth", label: "App Auth", icon: UsersRound },
  {
    href: "/dashboard/environment-variables",
    label: "Env Vars",
    icon: KeyRound,
  },
  { href: "/dashboard/app-auth", label: "App Auth", icon: UsersRound },
  {
    href: "/dashboard/ai-platform",
    label: "AI CRM",
    icon: Bot,
    children: [
      { href: "/dashboard/ai-platform/contacts", label: "CRM" },
      { href: "/dashboard/ai-platform/chats", label: "Chats" },
      { href: "/dashboard/ai-platform/channels", label: "Channels" },
      { href: "/dashboard/ai-platform/agents", label: "Agents" },
      { href: "/dashboard/ai-platform/playbooks", label: "Playbooks" },
      { href: "/dashboard/ai-platform/campaigns", label: "Campaigns" },
      { href: "/dashboard/ai-platform/queue", label: "Queue" },
      { href: "/dashboard/ai-platform/activities", label: "Activities" },
    ],
  },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background/96 lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/12 text-primary">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Basix Core</p>
            <p className="text-xs text-muted-foreground">Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const children = "children" in item ? item.children : undefined;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-secondary text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
                {active && children ? (
                  <div className="mt-1 space-y-1 pl-8">
                    {children.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                            childActive && "bg-secondary/70 text-foreground",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
            <Activity className="size-4 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                Control plane
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Multi-tenant safe
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
