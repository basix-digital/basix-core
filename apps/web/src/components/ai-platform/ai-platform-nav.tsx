import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/lib/api/types";

const sections = [
  { href: "/dashboard/ai-platform", label: "Overview" },
  { href: "/dashboard/ai-platform/contacts", label: "CRM" },
  { href: "/dashboard/ai-platform/chats", label: "Chats" },
  { href: "/dashboard/ai-platform/channels", label: "Channels" },
  { href: "/dashboard/ai-platform/agents", label: "Agents" },
  { href: "/dashboard/ai-platform/playbooks", label: "Playbooks" },
  { href: "/dashboard/ai-platform/campaigns", label: "Campaigns" },
  { href: "/dashboard/ai-platform/queue", label: "Queue" },
  { href: "/dashboard/ai-platform/activities", label: "Activities" },
];

export function selectAiTenant(tenants: Tenant[], tenantId?: string) {
  return tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0] ?? null;
}

export function AiPlatformHeader({
  tenants,
  selectedTenant,
  currentPath,
}: {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  currentPath: string;
}) {
  const tenantQuery = selectedTenant ? `?tenantId=${selectedTenant.id}` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            AI Agent Platform + CRM
          </p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            SDR Multi-Tenant
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`${currentPath}?tenantId=${tenant.id}`}
              className={cn(
                "inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
                selectedTenant?.id === tenant.id &&
                  "bg-secondary text-foreground",
              )}
            >
              {tenant.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={`${section.href}${tenantQuery}`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
              currentPath === section.href &&
                "border-primary/30 bg-primary/12 text-primary",
            )}
          >
            {section.label}
          </Link>
        ))}
        {selectedTenant ? (
          <Badge variant="neutral">{selectedTenant.slug}</Badge>
        ) : null}
      </div>
    </div>
  );
}
