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
  createAiCampaign,
  createAiMessageTemplate,
  listAiCampaigns,
  listAiChannels,
  listAiContacts,
  listAiMessageTemplates,
  listTenants,
  sendAiNotification,
} from "@/lib/api/console";
import { formatDate } from "@/lib/format";

async function createTemplateAction(formData: FormData) {
  "use server";

  const channelType = String(formData.get("channelType") ?? "whatsapp") as
    | "whatsapp"
    | "email";
  const requestedProvider = optionalMessagingProvider(formData.get("provider"));
  await createAiMessageTemplate({
    tenantId: String(formData.get("tenantId") ?? ""),
    name: String(formData.get("name") ?? ""),
    channelType,
    provider:
      channelType === "email"
        ? "brevo"
        : requestedProvider === "sent_dm"
          ? "sent_dm"
          : "twilio",
    providerTemplateId: optionalString(formData.get("providerTemplateId")),
    subject: optionalString(formData.get("subject")),
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/dashboard/ai-platform/campaigns");
}

async function createCampaignAction(formData: FormData) {
  "use server";

  await createAiCampaign({
    tenantId: String(formData.get("tenantId") ?? ""),
    templateId: String(formData.get("templateId") ?? ""),
    name: String(formData.get("name") ?? ""),
    channelType: optionalChannelType(formData.get("channelType")),
    channelId: optionalString(formData.get("channelId")),
    audienceStatus: optionalString(formData.get("audienceStatus")),
  });
  revalidatePath("/dashboard/ai-platform/campaigns");
}

async function sendNotificationAction(formData: FormData) {
  "use server";

  await sendAiNotification({
    tenantId: String(formData.get("tenantId") ?? ""),
    templateId: String(formData.get("templateId") ?? ""),
    channelId: optionalString(formData.get("channelId")),
    contactId: optionalString(formData.get("contactId")),
    phoneNumber: optionalString(formData.get("phoneNumber")),
    email: optionalString(formData.get("email")),
  });
  revalidatePath("/dashboard/ai-platform/campaigns");
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function optionalChannelType(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text === "whatsapp" || text === "email" ? text : undefined;
}

function optionalMessagingProvider(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text === "twilio" || text === "sent_dm" || text === "brevo"
    ? text
    : undefined;
}

export default async function AiCampaignsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const [templates, campaigns, channels, contacts] = selectedTenant
    ? await Promise.all([
        listAiMessageTemplates(selectedTenant.id).catch(() => []),
        listAiCampaigns(selectedTenant.id).catch(() => null),
        listAiChannels(selectedTenant.id).catch(() => []),
        listAiContacts(selectedTenant.id, 100).catch(() => null),
      ])
    : [[], null, [], null];

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/campaigns"
      />

      {!selectedTenant ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState title="No tenant selected" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create template</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createTemplateAction} className="grid gap-4">
                  <input
                    type="hidden"
                    name="tenantId"
                    value={selectedTenant.id}
                  />
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Name">
                      <Input
                        name="name"
                        required
                        placeholder="Trial follow-up"
                      />
                    </Field>
                    <Field label="Channel">
                      <Select name="channelType" defaultValue="whatsapp">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                      </Select>
                    </Field>
                    <Field label="Provider">
                      <Select name="provider" defaultValue="twilio">
                        <option value="twilio">Twilio</option>
                        <option value="sent_dm">Sent.dm</option>
                        <option value="brevo">Brevo</option>
                      </Select>
                    </Field>
                    <Field label="Provider template">
                      <Input
                        name="providerTemplateId"
                        placeholder="Twilio, Sent.dm, or Brevo ID"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Subject">
                      <Input name="subject" placeholder="Email subject" />
                    </Field>
                    <Field label="Variables">
                      <Input
                        name="variables"
                        placeholder="firstName, company"
                        disabled
                      />
                    </Field>
                  </div>
                  <Field label="Body">
                    <textarea
                      name="body"
                      required
                      placeholder="Oi {{firstName}}, posso te ajudar com os próximos passos?"
                      className="min-h-28 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button type="submit">Create template</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send notification</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={sendNotificationAction} className="grid gap-4">
                  <input
                    type="hidden"
                    name="tenantId"
                    value={selectedTenant.id}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Template">
                      <Select name="templateId" required>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.provider})
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="WhatsApp channel">
                      <Select name="channelId" defaultValue="">
                        <option value="">None</option>
                        {channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.displayName}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Contact">
                      <Select name="contactId" defaultValue="">
                        <option value="">Direct destination</option>
                        {contacts?.data.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.fullName ?? contact.phone}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Phone">
                      <Input name="phoneNumber" placeholder="+5511999999999" />
                    </Field>
                    <Field label="Email">
                      <Input
                        name="email"
                        type="email"
                        placeholder="lead@company.com"
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary">
                      Queue notification
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createCampaignAction}
                className="grid gap-4 lg:grid-cols-6"
              >
                <input
                  type="hidden"
                  name="tenantId"
                  value={selectedTenant.id}
                />
                <Field label="Name">
                  <Input name="name" required placeholder="May activation" />
                </Field>
                <Field label="Template">
                  <Select name="templateId" required>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Channel type">
                  <Select name="channelType" defaultValue="">
                    <option value="">Template default</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </Select>
                </Field>
                <Field label="WhatsApp channel">
                  <Select name="channelId" defaultValue="">
                    <option value="">None</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Audience status">
                  <Input name="audienceStatus" defaultValue="new" />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    Queue campaign
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Templates</CardTitle>
              </CardHeader>
              <CardContent>
                {!templates.length ? (
                  <EmptyState title="No templates created" />
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">
                              {template.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {template.subject ?? "No subject"}
                            </div>
                          </div>
                          <Badge
                            variant={
                              template.channelType === "whatsapp"
                                ? "default"
                                : "neutral"
                            }
                          >
                            {template.channelType}
                          </Badge>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {template.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {!campaigns?.data.length ? (
                  <EmptyState title="No campaigns queued" />
                ) : (
                  <div className="space-y-3">
                    {campaigns.data.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">
                              {campaign.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.template?.name ?? campaign.templateId}
                            </div>
                          </div>
                          <Badge
                            variant={
                              campaign.status === "queued"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {campaign.channelType} ·{" "}
                          {campaign.template?.provider ?? "provider"} ·{" "}
                          {campaign._count?.recipients ?? 0} recipients ·{" "}
                          {formatDate(campaign.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
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
