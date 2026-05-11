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
import {
  updateAiAgentSettings,
  listAiAgents,
  listTenants,
} from "@/lib/api/console";

async function updateAgentSettingsAction(formData: FormData) {
  "use server";

  const agentId = String(formData.get("agentId") ?? "");
  await updateAiAgentSettings(agentId, {
    tenantId: String(formData.get("tenantId") ?? ""),
    provider: String(formData.get("provider") ?? "openrouter"),
    model: optionalString(formData.get("model")),
    systemPrompt: String(formData.get("systemPrompt") ?? ""),
    temperature: optionalNumber(formData.get("temperature")),
    topP: optionalNumber(formData.get("topP")),
    topK: optionalInteger(formData.get("topK")),
  });
  revalidatePath("/dashboard/ai-platform/agents");
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function optionalInteger(value: FormDataEntryValue | null) {
  const numberValue = optionalNumber(value);
  return numberValue === undefined ? undefined : Math.trunc(numberValue);
}

export default async function AiAgentsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const agents = selectedTenant
    ? await listAiAgents(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/agents"
      />
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !agents?.length ? (
            <EmptyState title="No agents available" />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">
                        {agent.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {agent.id}
                      </div>
                    </div>
                    <Badge variant={agent.settings ? "default" : "neutral"}>
                      {agent.settings ? "customized" : "default"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                  <div className="mt-4 rounded-md bg-secondary/45 p-3 text-xs text-muted-foreground">
                    <div>
                      Provider: {agent.settings?.provider || "openrouter"}
                    </div>
                    <div>Model: {agent.settings?.model || "default"}</div>
                    <div>Temperature: {agent.settings?.temperature ?? "-"}</div>
                    <div>top_p: {agent.settings?.topP ?? "-"}</div>
                    <div>top_k: {agent.settings?.topK ?? "-"}</div>
                  </div>
                  <form
                    action={updateAgentSettingsAction}
                    className="mt-4 grid gap-3"
                  >
                    <input
                      type="hidden"
                      name="tenantId"
                      value={selectedTenant.id}
                    />
                    <input type="hidden" name="agentId" value={agent.id} />
                    <div className="grid gap-3 md:grid-cols-5">
                      <Field label="Provider">
                        <select
                          name="provider"
                          defaultValue={
                            agent.settings?.provider ?? "openrouter"
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="openrouter">OpenRouter</option>
                          <option value="openai">OpenAI compatible</option>
                        </select>
                      </Field>
                      <Field label="Model">
                        <Input
                          name="model"
                          defaultValue={agent.settings?.model ?? ""}
                          placeholder="openai/gpt-4.1-mini"
                        />
                      </Field>
                      <Field label="Temperature">
                        <Input
                          name="temperature"
                          type="number"
                          min={0}
                          max={2}
                          step="0.1"
                          defaultValue={agent.settings?.temperature ?? ""}
                        />
                      </Field>
                      <Field label="top_p">
                        <Input
                          name="topP"
                          type="number"
                          min={0}
                          max={1}
                          step="0.05"
                          defaultValue={agent.settings?.topP ?? ""}
                        />
                      </Field>
                      <Field label="top_k">
                        <Input
                          name="topK"
                          type="number"
                          min={0}
                          max={500}
                          defaultValue={agent.settings?.topK ?? ""}
                        />
                      </Field>
                    </div>
                    <div className="space-y-2">
                      <Label>System prompt</Label>
                      <textarea
                        name="systemPrompt"
                        required
                        defaultValue={
                          agent.settings?.systemPrompt ?? agent.description
                        }
                        className="min-h-28 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" variant="secondary">
                        Save LLM parameters
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
