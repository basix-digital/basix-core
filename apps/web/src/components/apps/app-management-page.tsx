"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Copy, KeyRound, Pencil, Plus, Save, X } from "lucide-react";
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
  useApiTokens,
  useApps,
  useCreateApiToken,
  useCreateApp,
  useRevokeApiToken,
  useTenantMetrics,
  useUpdateApp,
} from "@/hooks/use-console";
import { createApiTokenSchema, createAppSchema } from "@/lib/api/validators";
import type { ApiTokenRecord, AppRecord } from "@/lib/api/types";
import { formatCompactNumber, formatDate } from "@/lib/format";

type CreateAppValues = z.infer<typeof createAppSchema>;
type CreateTokenValues = z.infer<typeof createApiTokenSchema> & {
  scopesText?: string;
};
type EditAppValues = {
  name: string;
  slug: string;
  baseUrl: string;
  status: "active" | "disabled";
};

export function AppManagementPage() {
  const [tenantId, setTenantId] = useState("");
  const [tokenAppId, setTokenAppId] = useState("");
  const [tokenStatus, setTokenStatus] = useState("all");
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editAppValues, setEditAppValues] = useState<EditAppValues>({
    name: "",
    slug: "",
    baseUrl: "",
    status: "active",
  });
  const [createdToken, setCreatedToken] = useState<ApiTokenRecord | null>(null);
  const apps = useApps(tenantId);
  const apiTokens = useApiTokens({
    tenantId,
    appId: tokenAppId,
    status: tokenStatus,
  });
  const createApp = useCreateApp();
  const updateApp = useUpdateApp();
  const createToken = useCreateApiToken();
  const revokeToken = useRevokeApiToken();
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

  const appsById = useMemo(() => {
    return new Map(apps.data?.data.map((app) => [app.id, app]) ?? []);
  }, [apps.data?.data]);

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

  function startEditingApp(app: AppRecord) {
    setEditingAppId(app.id);
    setEditAppValues({
      name: app.name,
      slug: app.slug,
      baseUrl: app.baseUrl ?? "",
      status: app.status === "disabled" ? "disabled" : "active",
    });
  }

  async function saveApp(appId: string) {
    const updated = await updateApp.mutateAsync({
      id: appId,
      body: {
        name: editAppValues.name,
        slug: editAppValues.slug,
        baseUrl: editAppValues.baseUrl,
        status: editAppValues.status,
      },
    });
    setEditingAppId(null);
    if (tokenAppId === appId && updated.status !== "active") {
      setTokenAppId("");
    }
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
                    setTokenAppId("");
                    setEditingAppId(null);
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
                setTokenAppId("");
                setEditingAppId(null);
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.data.data.map((app) => {
                  const editing = editingAppId === app.id;

                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        {editing ? (
                          <div className="grid min-w-56 gap-2">
                            <Input
                              value={editAppValues.name}
                              onChange={(event) =>
                                setEditAppValues((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                            />
                            <Input
                              value={editAppValues.slug}
                              onChange={(event) =>
                                setEditAppValues((current) => ({
                                  ...current,
                                  slug: event.target.value,
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-foreground">
                              {app.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {app.slug}
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <Select
                            value={editAppValues.status}
                            onChange={(event) =>
                              setEditAppValues((current) => ({
                                ...current,
                                status: event.target.value as
                                  | "active"
                                  | "disabled",
                              }))
                            }
                          >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                          </Select>
                        ) : (
                          <StatusBadge status={app.status} />
                        )}
                      </TableCell>
                      <TableCell className="max-w-72">
                        {editing ? (
                          <Input
                            value={editAppValues.baseUrl}
                            onChange={(event) =>
                              setEditAppValues((current) => ({
                                ...current,
                                baseUrl: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="block truncate">
                            {app.baseUrl ?? "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCompactNumber(appUsageById.get(app.id) ?? 0)}
                      </TableCell>
                      <TableCell>{formatDate(app.createdAt)}</TableCell>
                      <TableCell>
                        {editing ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={updateApp.isPending}
                              onClick={() => saveApp(app.id)}
                            >
                              <Save />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingAppId(null)}
                            >
                              <X />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingApp(app)}
                          >
                            <Pencil />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No apps found" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>API tokens by tenant</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row">
              <Select
                value={tokenAppId}
                onChange={(event) => setTokenAppId(event.target.value)}
              >
                <option value="">All apps</option>
                {apps.data?.data.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </Select>
              <Select
                value={tokenStatus}
                onChange={(event) => setTokenStatus(event.target.value)}
              >
                <option value="all">All tokens</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {apiTokens.isLoading ? (
            <div className="h-72 animate-pulse rounded-lg bg-secondary" />
          ) : apiTokens.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiTokens.data.map((token) => {
                  const status = getTokenStatus(token);
                  const canRevoke = status === "active";

                  return (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {token.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          prefix: {token.prefix}
                        </div>
                      </TableCell>
                      <TableCell>
                        {appsById.get(token.appId)?.name ?? token.appId}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="max-w-72 truncate">
                        {token.scopes.length ? token.scopes.join(", ") : "-"}
                      </TableCell>
                      <TableCell>{formatDate(token.lastUsedAt)}</TableCell>
                      <TableCell>{formatDate(token.expiresAt)}</TableCell>
                      <TableCell>
                        {canRevoke ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={revokeToken.isPending}
                            onClick={() => revokeToken.mutate(token.id)}
                          >
                            <Ban />
                            Revoke
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No API tokens found" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getTokenStatus(token: ApiTokenRecord) {
  if (token.revokedAt || token.status === "revoked") return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
    return "expired";
  }
  return token.status;
}
