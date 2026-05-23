"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { consoleFetch } from "@/lib/api/client";
import type {
  ApiTokenRecord,
  AppAuthInvitation,
  AppAuthUser,
  AppRecord,
  BillingSnapshot,
  DashboardOverview,
  Tenant,
  TenantEnvironmentVariable,
  TenantMetrics,
  TenantRow,
} from "@/lib/api/types";

export const queryKeys = {
  session: ["session"] as const,
  dashboard: ["dashboard"] as const,
  tenants: (params: Record<string, string | number>) =>
    ["tenants", params] as const,
  apps: (tenantId: string) => ["apps", tenantId] as const,
  apiTokens: (params: Record<string, string>) =>
    ["api-tokens", params] as const,
  environmentVariables: (params: Record<string, string>) =>
    ["environment-variables", params] as const,
  appAuthUsers: (params: Record<string, string>) =>
    ["app-auth-users", params] as const,
  appAuthInvitations: (params: Record<string, string>) =>
    ["app-auth-invitations", params] as const,
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

export function useUpdateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      id: string;
      body: {
        name?: string;
        slug?: string;
        baseUrl?: string | null;
        status?: "active" | "disabled";
      };
    }) =>
      consoleFetch<AppRecord>(`/api/console/apps/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify(request.body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["apps"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useApiTokens(params: {
  tenantId: string;
  appId: string;
  status: string;
}) {
  const search = new URLSearchParams({
    tenantId: params.tenantId,
    status: params.status,
  });
  if (params.appId) {
    search.set("appId", params.appId);
  }

  return useQuery({
    queryKey: queryKeys.apiTokens(params),
    queryFn: () =>
      consoleFetch<ApiTokenRecord[]>(
        `/api/console/api-tokens?${search.toString()}`,
      ),
    enabled: Boolean(params.tenantId),
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      void queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiTokenId: string) =>
      consoleFetch<ApiTokenRecord>("/api/console/api-tokens/revoke", {
        method: "POST",
        body: JSON.stringify({ apiTokenId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      void queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useEnvironmentVariables(params: {
  tenantId: string;
  status: string;
  search: string;
}) {
  const search = new URLSearchParams({
    tenantId: params.tenantId,
    status: params.status,
    search: params.search,
  });

  return useQuery({
    queryKey: queryKeys.environmentVariables(params),
    queryFn: () =>
      consoleFetch<{ data: TenantEnvironmentVariable[]; tenants: Tenant[] }>(
        `/api/console/environment-variables?${search.toString()}`,
      ),
  });
}

export function useCreateEnvironmentVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      tenantId: string;
      key: string;
      value: string;
      description?: string;
    }) =>
      consoleFetch<TenantEnvironmentVariable>(
        "/api/console/environment-variables",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["environment-variables"],
      });
    },
  });
}

export function useRotateEnvironmentVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { id: string; value: string }) =>
      consoleFetch<TenantEnvironmentVariable>(
        `/api/console/environment-variables/${request.id}/rotate`,
        {
          method: "POST",
          body: JSON.stringify({ value: request.value }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["environment-variables"],
      });
    },
  });
}

export function useRevokeEnvironmentVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      consoleFetch<TenantEnvironmentVariable>(
        `/api/console/environment-variables/${id}/revoke`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["environment-variables"],
      });
    },
  });
}

export function useAppAuthUsers(params: {
  tenantId: string;
  appId: string;
  status: string;
  search: string;
}) {
  const search = new URLSearchParams({
    tenantId: params.tenantId,
    status: params.status,
    search: params.search,
  });
  if (params.appId) {
    search.set("appId", params.appId);
  }

  return useQuery({
    queryKey: queryKeys.appAuthUsers(params),
    queryFn: () =>
      consoleFetch<AppAuthUser[]>(
        `/api/console/app-auth/users?${search.toString()}`,
      ),
    enabled: Boolean(params.tenantId),
  });
}

export function useUpdateAppAuthUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      id: string;
      body: {
        name?: string;
        status?: "pending" | "active" | "disabled";
        scopes?: string[];
      };
    }) =>
      consoleFetch<AppAuthUser>(`/api/console/app-auth/users/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify(request.body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-auth-users"] });
    },
  });
}

export function useAppAuthInvitations(params: {
  tenantId: string;
  appId: string;
  status: string;
}) {
  const search = new URLSearchParams({
    tenantId: params.tenantId,
    status: params.status,
  });
  if (params.appId) {
    search.set("appId", params.appId);
  }

  return useQuery({
    queryKey: queryKeys.appAuthInvitations(params),
    queryFn: () =>
      consoleFetch<AppAuthInvitation[]>(
        `/api/console/app-auth/invitations?${search.toString()}`,
      ),
    enabled: Boolean(params.tenantId),
  });
}

export function useCreateAppAuthInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      tenantId: string;
      appId: string;
      email: string;
      name?: string;
      scopes?: string[];
    }) =>
      consoleFetch<AppAuthInvitation>("/api/console/app-auth/invitations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-auth-users"] });
      void queryClient.invalidateQueries({
        queryKey: ["app-auth-invitations"],
      });
    },
  });
}

export function useAppAuthInvitationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { id: string; action: "resend" | "revoke" }) =>
      consoleFetch<AppAuthInvitation>(
        `/api/console/app-auth/invitations/${request.id}/${request.action}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["app-auth-invitations"],
      });
    },
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
