import {
  AiPlatformHeader,
  selectAiTenant,
} from "@/components/ai-platform/ai-platform-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAiQueue, listTenants } from "@/lib/api/console";
import { formatDate } from "@/lib/format";

export default async function AiQueueRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const queue = selectedTenant
    ? await listAiQueue(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/queue"
      />
      <Card>
        <CardHeader>
          <CardTitle>Message queue</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !queue?.data.length ? (
            <EmptyState title="Queue is empty" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.data.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {message.crmContact?.fullName ?? message.phoneNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {message.agentId}
                      </div>
                    </TableCell>
                    <TableCell>{message.channel?.displayName ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          message.status === "failed"
                            ? "danger"
                            : message.status === "queued"
                              ? "warning"
                              : "default"
                        }
                      >
                        {message.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {message.attempts}/{message.maxAttempts}
                    </TableCell>
                    <TableCell>{formatDate(message.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {message.normalizedInput ?? message.incomingMessage}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-red-300">
                      {message.error ?? "-"}
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
