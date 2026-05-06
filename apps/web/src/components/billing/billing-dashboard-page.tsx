"use client";

import { CreditCard, History, Receipt, ShieldOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBilling, useBillingAction } from "@/hooks/use-console";
import { formatCurrencyFromCents, formatDate } from "@/lib/format";

const tabs = [
  {
    value: "subscriptions",
    label: "Subscriptions",
    icon: <CreditCard className="size-4" />,
  },
  {
    value: "invoices",
    label: "Invoices",
    icon: <Receipt className="size-4" />,
  },
  { value: "events", label: "Events", icon: <History className="size-4" /> },
];

export function BillingDashboardPage() {
  const [tab, setTab] = useState("subscriptions");
  const billing = useBilling();
  const action = useBillingAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Billing Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Revenue Operations
          </h1>
        </div>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() =>
            action.mutate({ path: "/api/console/billing/process-overdue" })
          }
        >
          <ShieldOff />
          Process overdue
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} tabs={tabs} />

      <Card>
        <CardHeader>
          <CardTitle>
            {tabs.find((item) => item.value === tab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billing.isLoading ? (
            <div className="h-96 animate-pulse rounded-lg bg-secondary" />
          ) : billing.data ? (
            <>
              {tab === "subscriptions" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Period end</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.data.subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {subscription.tenant?.name ?? subscription.tenantId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.tenant?.slug}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {subscription.plan}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={subscription.status} />
                        </TableCell>
                        <TableCell>{subscription.billingCycle}</TableCell>
                        <TableCell>
                          {formatDate(subscription.currentPeriodEnd)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                path: `/api/console/billing/tenants/${subscription.tenantId}/suspend`,
                              })
                            }
                          >
                            Suspend tenant
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}

              {tab === "invoices" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.data.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {invoice.tenant?.name ?? invoice.tenantId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.externalRef ?? invoice.id.slice(0, 8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrencyFromCents(invoice.amountCents)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueAt)}</TableCell>
                        <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              action.isPending || invoice.status === "paid"
                            }
                            onClick={() =>
                              action.mutate({
                                path: `/api/console/billing/invoices/${invoice.id}/pay`,
                              })
                            }
                          >
                            Mark paid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}

              {tab === "events" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.data.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <StatusBadge status={event.type} />
                        </TableCell>
                        <TableCell>{event.tenantId.slice(0, 8)}</TableCell>
                        <TableCell>
                          {event.subscriptionId?.slice(0, 8) ?? "-"}
                        </TableCell>
                        <TableCell>
                          {event.invoiceId?.slice(0, 8) ?? "-"}
                        </TableCell>
                        <TableCell>{formatDate(event.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </>
          ) : (
            <EmptyState title="Billing unavailable" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
