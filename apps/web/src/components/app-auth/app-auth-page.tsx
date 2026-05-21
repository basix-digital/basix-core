"use client";

import { Ban, MailPlus, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
  useAppAuthInvitationAction,
  useAppAuthInvitations,
  useAppAuthUsers,
  useApps,
  useCreateAppAuthInvitation,
  useUpdateAppAuthUser,
} from "@/hooks/use-console";
import type { AppAuthInvitation } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

const DEFAULT_INVITE_SCOPES = "user";

export function AppAuthPage() {
  const [tenantId, setTenantId] = useState("");
  const [appId, setAppId] = useState("");
  const [userStatus, setUserStatus] = useState("all");
  const [invitationStatus, setInvitationStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [scopesText, setScopesText] = useState(DEFAULT_INVITE_SCOPES);

  const apps = useApps(tenantId);
  const users = useAppAuthUsers({
    tenantId,
    appId,
    status: userStatus,
    search,
  });
  const invitations = useAppAuthInvitations({
    tenantId,
    appId,
    status: invitationStatus,
  });
  const createInvitation = useCreateAppAuthInvitation();
  const invitationAction = useAppAuthInvitationAction();
  const updateUser = useUpdateAppAuthUser();

  useEffect(() => {
    const firstTenantId = apps.data?.tenants[0]?.id;
    if (!tenantId && firstTenantId) {
      setTenantId(firstTenantId);
    }
  }, [apps.data?.tenants, tenantId]);

  useEffect(() => {
    const firstAppId = apps.data?.data[0]?.id;
    if (!appId && firstAppId) {
      setAppId(firstAppId);
    }
  }, [appId, apps.data?.data]);

  const appsById = useMemo(() => {
    return new Map(apps.data?.data.map((app) => [app.id, app]) ?? []);
  }, [apps.data?.data]);

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scopes = parseScopes(scopesText);

    await createInvitation.mutateAsync({
      tenantId,
      appId,
      email,
      name: name || undefined,
      scopes,
    });
    setEmail("");
    setName("");
    setScopesText(DEFAULT_INVITE_SCOPES);
  }

  async function setUserStatusAction(
    id: string,
    status: "active" | "disabled",
  ) {
    await updateUser.mutateAsync({ id, body: { status } });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">App Auth</p>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Users and Invitations
        </h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-auth-tenant">Tenant</Label>
                  <Select
                    id="app-auth-tenant"
                    value={tenantId}
                    onChange={(event) => {
                      setTenantId(event.target.value);
                      setAppId("");
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
                <div className="space-y-2">
                  <Label htmlFor="app-auth-app">App</Label>
                  <Select
                    id="app-auth-app"
                    value={appId}
                    onChange={(event) => setAppId(event.target.value)}
                  >
                    <option value="">All apps</option>
                    {apps.data?.data.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="app-auth-user-status">Users</Label>
                  <Select
                    id="app-auth-user-status"
                    value={userStatus}
                    onChange={(event) => setUserStatus(event.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="disabled">Disabled</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-auth-invitation-status">
                    Invitations
                  </Label>
                  <Select
                    id="app-auth-invitation-status"
                    value={invitationStatus}
                    onChange={(event) =>
                      setInvitationStatus(event.target.value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                    <option value="all">All</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-auth-search">Search</Label>
                  <Input
                    id="app-auth-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite user</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={onInvite}>
              <div className="space-y-2">
                <Label htmlFor="invite-app">App</Label>
                <Select
                  id="invite-app"
                  value={appId}
                  required
                  onChange={(event) => setAppId(event.target.value)}
                >
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
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    required
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-scopes">Scopes</Label>
                <Input
                  id="invite-scopes"
                  value={scopesText}
                  onChange={(event) => setScopesText(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={!tenantId || !appId || createInvitation.isPending}
              >
                <MailPlus />
                Send invitation
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <div className="h-72 animate-pulse rounded-lg bg-secondary" />
          ) : users.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.name ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {appsById.get(user.appId)?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="max-w-72 truncate">
                      {formatScopes(user.scopes)}
                    </TableCell>
                    <TableCell>{formatDate(user.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.status !== "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateUser.isPending}
                            onClick={() =>
                              setUserStatusAction(user.id, "active")
                            }
                          >
                            <UserCheck />
                            Activate
                          </Button>
                        ) : null}
                        {user.status !== "disabled" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updateUser.isPending}
                            onClick={() =>
                              setUserStatusAction(user.id, "disabled")
                            }
                          >
                            <Ban />
                            Disable
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No app users found" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.isLoading ? (
            <div className="h-72 animate-pulse rounded-lg bg-secondary" />
          ) : invitations.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.data.map((invitation) => {
                  const status = getInvitationStatus(invitation);
                  const canAct = status === "pending" || status === "expired";

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {invitation.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invitation.name ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {appsById.get(invitation.appId)?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="max-w-72 truncate">
                        {formatScopes(invitation.scopes)}
                      </TableCell>
                      <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {canAct ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={invitationAction.isPending}
                              onClick={() =>
                                invitationAction.mutate({
                                  id: invitation.id,
                                  action: "resend",
                                })
                              }
                            >
                              <RefreshCw />
                              Resend
                            </Button>
                          ) : null}
                          {canAct ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={invitationAction.isPending}
                              onClick={() =>
                                invitationAction.mutate({
                                  id: invitation.id,
                                  action: "revoke",
                                })
                              }
                            >
                              <ShieldCheck />
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No invitations found" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseScopes(value: string) {
  const scopes = value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return scopes.length ? scopes : ["user"];
}

function formatScopes(scopes: string[]) {
  return scopes.length ? scopes.join(", ") : "-";
}

function getInvitationStatus(invitation: AppAuthInvitation) {
  if (invitation.revokedAt) return "revoked";
  if (invitation.consumedAt) return "accepted";
  if (new Date(invitation.expiresAt) <= new Date()) return "expired";
  return "pending";
}
