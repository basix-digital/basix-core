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
import { listAiContacts, listTenants } from "@/lib/api/console";
import { formatDate } from "@/lib/format";

export default async function AiContactsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const contacts = selectedTenant
    ? await listAiContacts(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/contacts"
      />
      <Card>
        <CardHeader>
          <CardTitle>CRM contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !contacts?.data.length ? (
            <EmptyState title="No CRM contacts yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Last contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.data.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {contact.fullName ?? contact.phone}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.email ?? contact.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{contact.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contact.pipeline?.name ?? "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.stage?.name ?? "-"}
                      </div>
                    </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
