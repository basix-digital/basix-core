"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, RotateCcw, Search, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { planKeys } from "@basix-core/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateTenant,
  useTenantAction,
  useTenants,
} from "@/hooks/use-console";
import { createTenantSchema } from "@/lib/api/validators";
import { formatCompactNumber, formatDate } from "@/lib/format";

type CreateTenantValues = z.infer<typeof createTenantSchema>;

export function TenantManagementPage() {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    plan: "all",
    page: 1,
    perPage: 10,
  });
  const tenants = useTenants(filters);
  const createTenant = useCreateTenant();
  const tenantAction = useTenantAction();
  const form = useForm<CreateTenantValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      plan: "starter",
    },
  });

  async function onCreateTenant(values: CreateTenantValues) {
    await createTenant.mutateAsync({
      name: values.name,
      slug: values.slug || undefined,
      plan: values.plan,
    });
    form.reset({ name: "", slug: "", plan: "starter" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Tenant Management</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Tenants
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 lg:grid-cols-[1.2fr_1fr_180px_auto]"
            onSubmit={form.handleSubmit(onCreateTenant)}
          >
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Name</Label>
              <Input id="tenant-name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input id="tenant-slug" {...form.register("slug")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select id="tenant-plan" {...form.register("plan")}>
                {planKeys.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createTenant.isPending}>
                <Plus />
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Tenant directory</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-full pl-9 sm:w-72"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      page: 1,
                      search: event.target.value,
                    }))
                  }
                />
              </div>
              <Select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    page: 1,
                    status: event.target.value,
                  }))
                }
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
              <Select
                value={filters.plan}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    page: 1,
                    plan: event.target.value,
                  }))
                }
              >
                <option value="all">All plans</option>
                {planKeys.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tenants.isLoading ? (
            <div className="h-96 animate-pulse rounded-lg bg-secondary" />
          ) : tenants.data?.data.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Current usage</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.data.data.map((tenant) => {
                    const quotaPercent = tenant.quotaLimit
                      ? (tenant.currentUsage / tenant.quotaLimit) * 100
                      : 0;

                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {tenant.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tenant.slug}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {tenant.plan ?? "starter"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tenant.status} />
                        </TableCell>
                        <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                        <TableCell>
                          {formatCompactNumber(tenant.currentUsage)}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-36 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <StatusBadge status={tenant.quotaStatus} />
                              <span className="text-xs text-muted-foreground">
                                {tenant.quotaLimit
                                  ? formatCompactNumber(tenant.quotaLimit)
                                  : "Custom"}
                              </span>
                            </div>
                            <Progress value={quotaPercent} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <TenantActions
                            tenantId={tenant.id}
                            status={tenant.status}
                            currentPlan={tenant.plan ?? "starter"}
                            pending={tenantAction.isPending}
                            onAction={(path, body) =>
                              tenantAction.mutate({ path, body })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {tenants.data.pagination.page} of{" "}
                  {tenants.data.pagination.pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        page: Math.max(1, current.page - 1),
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={filters.page >= tenants.data.pagination.pageCount}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        page: current.page + 1,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="No tenants found" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantActions({
  tenantId,
  status,
  currentPlan,
  pending,
  onAction,
}: {
  tenantId: string;
  status: string;
  currentPlan: string;
  pending: boolean;
  onAction: (path: string, body?: unknown) => void;
}) {
  const [plan, setPlan] = useState(currentPlan);

  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/dashboard/usage?tenantId=${tenantId}`}
        className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        View
        <ArrowRight className="size-3.5" />
      </Link>
      {status === "suspended" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            onAction(`/api/console/billing/tenants/${tenantId}/reactivate`)
          }
        >
          <RotateCcw />
          Reactivate
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            onAction(`/api/console/billing/tenants/${tenantId}/suspend`)
          }
        >
          <ShieldOff />
          Suspend
        </Button>
      )}
      <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
        {planKeys.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending || plan === currentPlan}
        onClick={() =>
          onAction(`/api/console/billing/tenants/${tenantId}/plan`, { plan })
        }
      >
        Upgrade
      </Button>
    </div>
  );
}
