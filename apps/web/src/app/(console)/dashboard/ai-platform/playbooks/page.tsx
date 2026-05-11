import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import {
  AiPlatformHeader,
  selectAiTenant,
} from "@/components/ai-platform/ai-platform-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignAiPlaybook,
  createAiPlaybook,
  listAiAgents,
  listAiPlaybooks,
  listTenants,
  updateAiPlaybook,
} from "@/lib/api/console";
import { formatCompactNumber, formatDate } from "@/lib/format";

async function createPlaybookAction(formData: FormData) {
  "use server";

  await createAiPlaybook({
    tenantId: String(formData.get("tenantId") ?? ""),
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? "objection"),
    category: String(formData.get("category") ?? ""),
    stage: String(formData.get("stage") ?? "awareness"),
    triggerPhrases: splitCsv(formData.get("triggerPhrases")),
    situation: String(formData.get("situation") ?? ""),
    responseStrategy: String(formData.get("responseStrategy") ?? ""),
    exampleResponse: String(formData.get("exampleResponse") ?? ""),
    rationale: String(formData.get("rationale") ?? ""),
    nextStep: String(formData.get("nextStep") ?? ""),
    priority: optionalInteger(formData.get("priority")),
    tags: splitCsv(formData.get("tags")),
    minScore: optionalNumber(formData.get("minScore")),
  });
  revalidatePath("/dashboard/ai-platform/playbooks");
}

async function updatePlaybookStatusAction(formData: FormData) {
  "use server";

  await updateAiPlaybook(String(formData.get("playbookId") ?? ""), {
    tenantId: String(formData.get("tenantId") ?? ""),
    status: String(formData.get("status") ?? "draft"),
  });
  revalidatePath("/dashboard/ai-platform/playbooks");
}

async function assignPlaybookAction(formData: FormData) {
  "use server";

  await assignAiPlaybook(String(formData.get("playbookId") ?? ""), {
    tenantId: String(formData.get("tenantId") ?? ""),
    agentId: String(formData.get("agentId") ?? ""),
    playbookVersionId: optionalString(formData.get("playbookVersionId")),
    isEnabled: true,
    isActive: true,
    priorityOverride: optionalInteger(formData.get("priorityOverride")),
    minScoreOverride: optionalNumber(formData.get("minScoreOverride")),
  });
  revalidatePath("/dashboard/ai-platform/playbooks");
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

function splitCsv(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function AiPlaybooksRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const [playbooks, agents] = selectedTenant
    ? await Promise.all([
        listAiPlaybooks(selectedTenant.id).catch(() => null),
        listAiAgents(selectedTenant.id).catch(() => []),
      ])
    : [null, []];

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/playbooks"
      />
      {selectedTenant ? (
        <Card>
          <CardHeader>
            <CardTitle>Create playbook</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPlaybookAction} className="grid gap-4">
              <input type="hidden" name="tenantId" value={selectedTenant.id} />
              <div className="grid gap-3 lg:grid-cols-4">
                <Field label="Title">
                  <Input name="title" required placeholder="Objection: price" />
                </Field>
                <Field label="Type">
                  <Select name="type" defaultValue="objection">
                    <option value="objection">Objection</option>
                    <option value="pattern">Pattern</option>
                    <option value="correction">Correction</option>
                  </Select>
                </Field>
                <Field label="Category">
                  <Input name="category" required placeholder="pricing" />
                </Field>
                <Field label="Stage">
                  <Select name="stage" defaultValue="consideration">
                    <option value="awareness">Awareness</option>
                    <option value="consideration">Consideration</option>
                    <option value="closing">Closing</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Situation">
                  <Input
                    name="situation"
                    required
                    placeholder="Lead says the price is too high"
                  />
                </Field>
                <Field label="Next step">
                  <Input
                    name="nextStep"
                    required
                    placeholder="Offer ROI breakdown and book follow-up"
                  />
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <Field label="Trigger phrases">
                  <Input
                    name="triggerPhrases"
                    placeholder="caro, orçamento, sem verba"
                  />
                </Field>
                <Field label="Tags">
                  <Input name="tags" placeholder="pricing, objection" />
                </Field>
                <Field label="Priority">
                  <Input
                    name="priority"
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={5}
                  />
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <TextareaField
                  name="responseStrategy"
                  label="Response strategy"
                />
                <TextareaField
                  name="exampleResponse"
                  label="Example response"
                />
                <TextareaField name="rationale" label="Rationale" />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create playbook</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Playbooks</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !playbooks?.length ? (
            <EmptyState title="No playbooks created" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Playbook</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playbooks.map((playbook) => (
                  <TableRow key={playbook.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {playbook.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {playbook.category}
                      </div>
                    </TableCell>
                    <TableCell>{playbook.type}</TableCell>
                    <TableCell>
                      <form
                        action={updatePlaybookStatusAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="tenantId"
                          value={selectedTenant.id}
                        />
                        <input
                          type="hidden"
                          name="playbookId"
                          value={playbook.id}
                        />
                        <Select
                          name="status"
                          defaultValue={playbook.status}
                          className="h-8 w-28"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </Select>
                        <Button type="submit" variant="secondary" size="sm">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>
                      {formatCompactNumber(playbook.usageCount)}
                    </TableCell>
                    <TableCell>{formatDate(playbook.updatedAt)}</TableCell>
                    <TableCell>
                      <form
                        action={assignPlaybookAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="tenantId"
                          value={selectedTenant.id}
                        />
                        <input
                          type="hidden"
                          name="playbookId"
                          value={playbook.id}
                        />
                        <input
                          type="hidden"
                          name="playbookVersionId"
                          value={playbook.currentVersionId ?? ""}
                        />
                        <Select name="agentId" className="h-8 w-44">
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" size="sm">
                          Assign
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

function TextareaField({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea
        name={name}
        required
        className="min-h-28 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
