import Link from "next/link";
import {
  AiPlatformHeader,
  selectAiTenant,
} from "@/components/ai-platform/ai-platform-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAiPlatformSnapshot, listTenants } from "@/lib/api/console";
import { formatCompactNumber, formatDate } from "@/lib/format";

export default async function AiPlatformRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const snapshot = selectedTenant
    ? await getAiPlatformSnapshot(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform"
      />

      {!selectedTenant ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Create a tenant before enabling the AI Agent Platform.
          </CardContent>
        </Card>
      ) : !snapshot ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Unable to load AI platform data for {selectedTenant.name}.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="CRM contacts"
              value={snapshot.metrics.contacts}
            />
            <MetricCard
              label="Conversations"
              value={snapshot.metrics.conversations}
            />
            <MetricCard
              label="Human takeover"
              value={snapshot.metrics.humanConversations}
            />
            <MetricCard
              label="Queued / failed"
              value={`${snapshot.metrics.queuedMessages}/${snapshot.metrics.failedMessages}`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SectionLink
              href={`/dashboard/ai-platform/agents?tenantId=${selectedTenant.id}`}
              title="Agents"
              description="Catalog and tenant LLM settings"
            />
            <SectionLink
              href={`/dashboard/ai-platform/playbooks?tenantId=${selectedTenant.id}`}
              title="Playbooks"
              description="Tenant sales intelligence"
            />
            <SectionLink
              href={`/dashboard/ai-platform/queue?tenantId=${selectedTenant.id}`}
              title="Queue"
              description="Async processing status"
            />
            <SectionLink
              href={`/dashboard/ai-platform/channels?tenantId=${selectedTenant.id}`}
              title="Channels"
              description="WhatsApp numbers and defaults"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Last message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.chats.map((chat) => (
                      <TableRow key={chat.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {chat.crmContact?.fullName ?? chat.phoneNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {chat.agentId}
                          </div>
                        </TableCell>
                        <TableCell>
                          {chat.channel?.displayName ?? "Channel"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              chat.mode === "human" ? "warning" : "default"
                            }
                          >
                            {chat.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {chat.lastMessage}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {channel.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {channel.phoneNumber}
                      </div>
                    </div>
                    <Badge
                      variant={
                        channel.status === "active" ? "default" : "neutral"
                      }
                    >
                      {channel.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>CRM contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Last contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {contact.fullName ?? contact.phone}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.email ?? contact.source}
                          </div>
                        </TableCell>
                        <TableCell>{contact.status}</TableCell>
                        <TableCell>{contact.leadScore}</TableCell>
                        <TableCell>
                          {contact.lastContactAt
                            ? formatDate(contact.lastContactAt)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Playbooks and agents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {snapshot.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="font-medium text-foreground">
                        {agent.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {agent.description}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  {snapshot.playbooks.slice(0, 5).map((playbook) => (
                    <div
                      key={playbook.id}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {playbook.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {playbook.type} / {playbook.category}
                        </div>
                      </div>
                      <Badge variant="accent">
                        {formatCompactNumber(playbook.usageCount)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">
          {typeof value === "number" ? formatCompactNumber(value) : value}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/40"
    >
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </Link>
  );
}
