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
import { listAiActivities, listTenants } from "@/lib/api/console";
import { formatDate } from "@/lib/format";

export default async function AiActivitiesRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const activities = selectedTenant
    ? await listAiActivities(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/activities"
      />
      <Card>
        <CardHeader>
          <CardTitle>CRM activities</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !activities?.length ? (
            <EmptyState title="No activities recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Body</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {activity.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.contact?.fullName ??
                        activity.contact?.phone ??
                        "-"}
                    </TableCell>
                    <TableCell>
                      {activity.direction ? (
                        <Badge variant="neutral">{activity.direction}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(activity.occurredAt)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {activity.body ?? "-"}
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
