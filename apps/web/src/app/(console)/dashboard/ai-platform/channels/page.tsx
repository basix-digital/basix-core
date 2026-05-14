import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import {
  AiPlatformHeader,
  selectAiTenant,
} from "@/components/ai-platform/ai-platform-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createAiChannel,
  listAiAgents,
  listAiChannels,
  listTenants,
  updateAiChannel,
} from "@/lib/api/console";
import { formatDate } from "@/lib/format";

async function createChannelAction(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("tenantId") ?? "");
  const rateLimit = optionalNumber(formData.get("rateLimitPerMinute"));
  await createAiChannel({
    tenantId,
    displayName: String(formData.get("displayName") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    agentIdDefault: String(formData.get("agentIdDefault") ?? ""),
    provider: String(formData.get("provider") ?? "twilio"),
    ...(rateLimit ? { rateLimitPerMinute: rateLimit } : {}),
  });
  revalidatePath("/dashboard/ai-platform/channels");
}

async function updateChannelAction(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("tenantId") ?? "");
  const channelId = String(formData.get("channelId") ?? "");
  const rateLimit = optionalNumber(formData.get("rateLimitPerMinute"));
  await updateAiChannel(channelId, {
    tenantId,
    displayName: String(formData.get("displayName") ?? ""),
    agentIdDefault: String(formData.get("agentIdDefault") ?? ""),
    status: String(formData.get("status") ?? "active"),
    ...(rateLimit ? { rateLimitPerMinute: rateLimit } : {}),
  });
  revalidatePath("/dashboard/ai-platform/channels");
}

function optionalNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

export default async function AiChannelsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const [channels, agents] = selectedTenant
    ? await Promise.all([
        listAiChannels(selectedTenant.id).catch(() => null),
        listAiAgents(selectedTenant.id).catch(() => []),
      ])
    : [null, []];

  const defaultAgentId = agents[0]?.id ?? "sdr_assistant";

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/channels"
      />
      {selectedTenant ? (
        <Card>
          <CardHeader>
            <CardTitle>Create WhatsApp channel</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createChannelAction}
              className="grid gap-4 lg:grid-cols-5"
            >
              <input type="hidden" name="tenantId" value={selectedTenant.id} />
              <Field label="Name">
                <Input name="displayName" placeholder="Inbound SDR" required />
              </Field>
              <Field label="Phone">
                <Input
                  name="phoneNumber"
                  placeholder="+5511999999999"
                  required
                />
              </Field>
              <Field label="Default agent">
                <Select name="agentIdDefault" defaultValue={defaultAgentId}>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Limit/min">
                <Input
                  name="rateLimitPerMinute"
                  type="number"
                  min={1}
                  placeholder="60"
                />
              </Field>
              <div className="flex items-end">
                <input type="hidden" name="provider" value="twilio" />
                <Button type="submit" className="w-full">
                  Create
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp channels</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !channels?.length ? (
            <EmptyState title="No WhatsApp channels configured" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">
                      {channel.displayName}
                    </div>
                    <Badge
                      variant={
                        channel.status === "active" ? "default" : "neutral"
                      }
                    >
                      {channel.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {channel.phoneNumber}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Default agent: {channel.agentIdDefault}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Provider: {channel.provider}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Limit/min: {channel.rateLimitPerMinute ?? "unlimited"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {formatDate(channel.createdAt)}
                  </div>
                  <form
                    action={updateChannelAction}
                    className="mt-4 grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="tenantId"
                      value={selectedTenant.id}
                    />
                    <input type="hidden" name="channelId" value={channel.id} />
                    <Input
                      name="displayName"
                      defaultValue={channel.displayName}
                      aria-label="Channel name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        name="agentIdDefault"
                        defaultValue={channel.agentIdDefault}
                        aria-label="Default agent"
                      >
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        name="status"
                        defaultValue={channel.status}
                        aria-label="Channel status"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        name="rateLimitPerMinute"
                        type="number"
                        min={1}
                        defaultValue={channel.rateLimitPerMinute ?? ""}
                        aria-label="Rate limit per minute"
                      />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
