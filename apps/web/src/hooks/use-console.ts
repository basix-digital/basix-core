"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { consoleFetch } from "@/lib/api/client";
import type {
  ApiTokenRecord,
  AppRecord,
  BillingSnapshot,
  DashboardOverview,
  Tenant,
  TenantMetrics,
  TenantRow,
} from "@/lib/api/types";

export const queryKeys = {
  session: ["session"] as const,
  dashboard: ["dashboard"] as const,
  tenants: (params: Record<string, string | number>) =>
    ["tenants", params] as const,
  apps: (tenantId: string) => ["apps", tenantId] as const,
  billing: ["billing"] as const,
  metrics: (tenantId: string) => ["metrics", tenantId] as const,
};

interface PaginatedTenants {
  data: TenantRow[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    pageCount: number;
  };
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => consoleFetch<DashboardOverview>("/api/console/dashboard"),
  });
}

export function useTenants(params: {
  search: string;
  status: string;
  plan: string;
  page: number;
  perPage: number;
}) {
  const search = new URLSearchParams({
    search: params.search,
    status: params.status,
    plan: params.plan,
    page: String(params.page),
    perPage: String(params.perPage),
  });

  return useQuery({
    queryKey: queryKeys.tenants(params),
    queryFn: () =>
      consoleFetch<PaginatedTenants>(
        `/api/console/tenants?${search.toString()}`,
      ),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; slug?: string; plan?: string }) =>
      consoleFetch<Tenant>("/api/console/tenants", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useApps(tenantId: string) {
  const search = tenantId ? `?tenantId=${tenantId}` : "";

  return useQuery({
    queryKey: queryKeys.apps(tenantId),
    queryFn: () =>
      consoleFetch<{ data: AppRecord[]; tenants: Tenant[] }>(
        `/api/console/apps${search}`,
      ),
  });
}

export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      tenantId: string;
      name: string;
      slug?: string;
      baseUrl?: string;
    }) =>
      consoleFetch<AppRecord>("/api/console/apps", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["apps"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCreateApiToken() {
  return useMutation({
    mutationFn: (payload: {
      appId: string;
      name?: string;
      scopes?: string[];
      expiresAt?: string;
    }) =>
      consoleFetch<ApiTokenRecord>("/api/console/api-tokens", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useBilling() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: async () => {
      const overview = await consoleFetch<DashboardOverview>(
        "/api/console/dashboard",
      );
      return overview.billing as BillingSnapshot;
    },
  });
}

export function useBillingAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { path: string }) =>
      consoleFetch(request.path, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useTenantAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { path: string; body?: unknown }) =>
      consoleFetch(request.path, {
        method: "POST",
        body: request.body ? JSON.stringify(request.body) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    },
  });
}

export function useTenantMetrics(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.metrics(tenantId),
    queryFn: () =>
      consoleFetch<TenantMetrics>(`/api/console/metrics/tenant/${tenantId}`),
    enabled: Boolean(tenantId),
  });
}
