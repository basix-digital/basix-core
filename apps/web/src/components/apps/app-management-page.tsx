"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, KeyRound, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useApps,
  useCreateApiToken,
  useCreateApp,
  useTenantMetrics,
} from "@/hooks/use-console";
import { createApiTokenSchema, createAppSchema } from "@/lib/api/validators";
import type { ApiTokenRecord } from "@/lib/api/types";
import { formatCompactNumber, formatDate } from "@/lib/format";

type CreateAppValues = z.infer<typeof createAppSchema>;
type CreateTokenValues = z.infer<typeof createApiTokenSchema> & {
  scopesText?: string;
};

export function AppManagementPage() {
  const [tenantId, setTenantId] = useState("");
  const [createdToken, setCreatedToken] = useState<ApiTokenRecord | null>(null);
  const apps = useApps(tenantId);
  const createApp = useCreateApp();
  const createToken = useCreateApiToken();
  const metrics = useTenantMetrics(tenantId);
  const appForm = useForm<CreateAppValues>({
    resolver: zodResolver(createAppSchema),
    defaultValues: {
      tenantId: "",
      name: "",
      slug: "",
      baseUrl: "",
    },
  });
  const tokenForm = useForm<CreateTokenValues>({
    defaultValues: {
      appId: "",
      name: "",
      scopesText: "read:usage",
      scopes: [],
      expiresAt: "",
    },
  });

  useEffect(() => {
    const firstTenantId = apps.data?.tenants[0]?.id;
    if (!tenantId && firstTenantId) {
      setTenantId(firstTenantId);
      appForm.setValue("tenantId", firstTenantId);
    }
  }, [appForm, apps.data?.tenants, tenantId]);

  const appUsageById = useMemo(() => {
    return new Map(
      metrics.data?.topApps.map((app) => [app.appId, app.requestCount]) ?? [],
    );
  }, [metrics.data?.topApps]);

  async function onCreateApp(values: CreateAppValues) {
    await createApp.mutateAsync({
      tenantId: values.tenantId,
      name: values.name,
      slug: values.slug || undefined,
      baseUrl: values.baseUrl || undefined,
    });
    appForm.reset({ tenantId, name: "", slug: "", baseUrl: "" });
  }

  async function onCreateToken(values: CreateTokenValues) {
    const scopes =
      values.scopesText
        ?.split(",")
        .map((scope) => scope.trim())
        .filter(Boolean) ?? [];
    const token = await createToken.mutateAsync({
      appId: values.appId,
      name: values.name || undefined,
      scopes,
      expiresAt: values.expiresAt
        ? new Date(values.expiresAt).toISOString()
        : undefined,
    });
    setCreatedToken(token);
    tokenForm.reset({
      appId: values.appId,
      name: "",
      scopesText: "read:usage",
      scopes: [],
      expiresAt: "",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">App Management</p>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Apps and API Tokens
        </h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create app</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={appForm.handleSubmit(onCreateApp)}
            >
              <div className="space-y-2">
                <Label htmlFor="app-tenant">Tenant</Label>
                <Select
                  id="app-tenant"
                  value={appForm.watch("tenantId")}
                  onChange={(event) => {
                    appForm.setValue("tenantId", event.target.value);
                    setTenantId(event.target.value);
                  }}
                >
                  <option value="">Select tenant</option>
                  {apps.data?.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Name</Label>
                  <Input id="app-name" {...appForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-slug">Slug</Label>
                  <Input id="app-slug" {...appForm.register("slug")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-url">Base URL</Label>
                <Input id="app-url" {...appForm.register("baseUrl")} />
              </div>
              <Button type="submit" disabled={createApp.isPending}>
                <Plus />
                Create app
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create API token</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={tokenForm.handleSubmit(onCreateToken)}
            >
              <div className="space-y-2">
                <Label htmlFor="token-app">App</Label>
                <Select id="token-app" {...tokenForm.register("appId")}>
                  <option value="">Select app</option>
                  {apps.data?.data.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="token-name">Name</Label>
                  <Input id="token-name" {...tokenForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-expiry">Expires at</Label>
                  <Input
                    id="token-expiry"
                    type="datetime-local"
                    {...tokenForm.register("expiresAt")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-scopes">Scopes</Label>
                <Input
                  id="token-scopes"
                  {...tokenForm.register("scopesText")}
                />
              </div>
              <Button type="submit" disabled={createToken.isPending}>
                <KeyRound />
                Issue token
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {createdToken?.token ? (
        <Card className="border-primary/30 bg-primary/8">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <code className="break-all rounded-md border border-primary/20 bg-background/70 px-3 py-2 text-sm text-primary">
                {createdToken.token}
              </code>
              <Button
                variant="outline"
                onClick={() =>
                  navigator.clipboard.writeText(createdToken.token ?? "")
                }
              >
                <Copy />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Apps by tenant</CardTitle>
            <Select
              value={tenantId}
              onChange={(event) => {
                setTenantId(event.target.value);
                appForm.setValue("tenantId", event.target.value);
              }}
            >
              <option value="">All tenants</option>
              {apps.data?.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {apps.isLoading ? (
            <div className="h-96 animate-pulse rounded-lg bg-secondary" />
          ) : apps.data?.data.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.data.data.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {app.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {app.slug}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="max-w-72 truncate">
                      {app.baseUrl ?? "-"}
                    </TableCell>
                    <TableCell>
                      {formatCompactNumber(appUsageById.get(app.id) ?? 0)}
                    </TableCell>
                    <TableCell>{formatDate(app.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No apps found" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
