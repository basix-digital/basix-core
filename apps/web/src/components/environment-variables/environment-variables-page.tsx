"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, KeyRound, Plus, RotateCcw, Save, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  useCreateEnvironmentVariable,
  useEnvironmentVariables,
  useRevokeEnvironmentVariable,
  useRotateEnvironmentVariable,
} from "@/hooks/use-console";
import type { TenantEnvironmentVariable } from "@/lib/api/types";
import { createEnvironmentVariableSchema } from "@/lib/api/validators";
import { formatDate } from "@/lib/format";

type CreateEnvironmentVariableValues = z.infer<
  typeof createEnvironmentVariableSchema
>;

export function EnvironmentVariablesPage() {
  const [filters, setFilters] = useState({
    tenantId: "",
    status: "active",
    search: "",
  });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotationValue, setRotationValue] = useState("");
  const variables = useEnvironmentVariables(filters);
  const createVariable = useCreateEnvironmentVariable();
  const rotateVariable = useRotateEnvironmentVariable();
  const revokeVariable = useRevokeEnvironmentVariable();
  const form = useForm<CreateEnvironmentVariableValues>({
    resolver: zodResolver(createEnvironmentVariableSchema),
    defaultValues: {
      tenantId: "",
      key: "",
      value: "",
      description: "",
    },
  });

  useEffect(() => {
    const firstTenantId = variables.data?.tenants[0]?.id;
    if (!filters.tenantId && firstTenantId) {
      setFilters((current) => ({ ...current, tenantId: firstTenantId }));
      form.setValue("tenantId", firstTenantId);
    }
  }, [filters.tenantId, form, variables.data?.tenants]);

  async function onCreateVariable(values: CreateEnvironmentVariableValues) {
    await createVariable.mutateAsync({
      tenantId: values.tenantId,
      key: values.key,
      value: values.value,
      description: values.description || undefined,
    });
    form.reset({
      tenantId: values.tenantId,
      key: "",
      value: "",
      description: "",
    });
  }

  async function onRotateVariable(variableId: string) {
    await rotateVariable.mutateAsync({
      id: variableId,
      value: rotationValue,
    });
    setRotatingId(null);
    setRotationValue("");
  }

  function startRotation(variable: TenantEnvironmentVariable) {
    setRotatingId(variable.id);
    setRotationValue("");
  }

  const tenants = variables.data?.tenants ?? [];
  const rows = variables.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tenant Environment</p>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Environment Variables
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create variable</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 xl:grid-cols-[1fr_1fr_1.3fr_1.4fr_auto]"
            onSubmit={form.handleSubmit(onCreateVariable)}
          >
            <div className="space-y-2">
              <Label htmlFor="env-tenant">Tenant</Label>
              <Select
                id="env-tenant"
                value={form.watch("tenantId")}
                onChange={(event) => {
                  form.setValue("tenantId", event.target.value);
                  setFilters((current) => ({
                    ...current,
                    tenantId: event.target.value,
                  }));
                }}
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-key">Key</Label>
              <Input
                id="env-key"
                value={form.watch("key")}
                onChange={(event) =>
                  form.setValue("key", event.target.value.toUpperCase())
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-value">Value</Label>
              <Input
                id="env-value"
                type="password"
                {...form.register("value")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-description">Description</Label>
              <Input id="env-description" {...form.register("description")} />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={createVariable.isPending || !form.watch("tenantId")}
              >
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
            <CardTitle>Variables by tenant</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row">
              <Select
                value={filters.tenantId}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    tenantId: event.target.value,
                  }));
                  form.setValue("tenantId", event.target.value);
                  setRotatingId(null);
                }}
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
                <option value="all">All variables</option>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-full pl-9 md:w-72"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {variables.isLoading ? (
            <div className="h-96 animate-pulse rounded-lg bg-secondary" />
          ) : rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rotated</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((variable) => {
                  const rotating = rotatingId === variable.id;
                  const active = variable.status === "active";

                  return (
                    <TableRow key={variable.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {variable.key}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded-md border border-border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                          ********
                        </code>
                      </TableCell>
                      <TableCell className="max-w-80">
                        <span className="block truncate">
                          {variable.description ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={variable.status} />
                      </TableCell>
                      <TableCell>{formatDate(variable.rotatedAt)}</TableCell>
                      <TableCell>{formatDate(variable.createdAt)}</TableCell>
                      <TableCell>
                        {active ? (
                          rotating ? (
                            <div className="flex min-w-72 flex-wrap gap-2">
                              <Input
                                className="h-8 min-w-44 flex-1"
                                type="password"
                                value={rotationValue}
                                onChange={(event) =>
                                  setRotationValue(event.target.value)
                                }
                              />
                              <Button
                                size="sm"
                                disabled={
                                  rotateVariable.isPending || !rotationValue
                                }
                                onClick={() => onRotateVariable(variable.id)}
                              >
                                <Save />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRotatingId(null);
                                  setRotationValue("");
                                }}
                              >
                                <X />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startRotation(variable)}
                              >
                                <RotateCcw />
                                Rotate
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={revokeVariable.isPending}
                                onClick={() =>
                                  revokeVariable.mutate(variable.id)
                                }
                              >
                                <Ban />
                                Revoke
                              </Button>
                            </div>
                          )
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
            <EmptyState title="No environment variables found">
              <KeyRound className="mx-auto size-5" />
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
