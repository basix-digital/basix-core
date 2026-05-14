import { revalidatePath } from "next/cache";
import {
  AiPlatformHeader,
  selectAiTenant,
} from "@/components/ai-platform/ai-platform-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listAiChats,
  listTenants,
  releaseAiChat,
  sendAiChatMessage,
  takeoverAiChat,
} from "@/lib/api/console";
import { formatDate } from "@/lib/format";

async function takeoverChatAction(formData: FormData) {
  "use server";

  await takeoverAiChat(String(formData.get("phone") ?? ""), {
    tenantId: String(formData.get("tenantId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
  });
  revalidatePath("/dashboard/ai-platform/chats");
}

async function releaseChatAction(formData: FormData) {
  "use server";

  await releaseAiChat(String(formData.get("phone") ?? ""), {
    tenantId: String(formData.get("tenantId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
  });
  revalidatePath("/dashboard/ai-platform/chats");
}

async function sendChatMessageAction(formData: FormData) {
  "use server";

  await sendAiChatMessage(String(formData.get("phone") ?? ""), {
    tenantId: String(formData.get("tenantId") ?? ""),
    channelId: String(formData.get("channelId") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/dashboard/ai-platform/chats");
}

export default async function AiChatsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await listTenants();
  const selectedTenant = selectAiTenant(tenants, params.tenantId);
  const chats = selectedTenant
    ? await listAiChats(selectedTenant.id).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      <AiPlatformHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        currentPath="/dashboard/ai-platform/chats"
      />
      <Card>
        <CardHeader>
          <CardTitle>Chats</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTenant ? (
            <EmptyState title="No tenant selected" />
          ) : !chats?.data.length ? (
            <EmptyState title="No conversations yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Last message</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chats.data.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {chat.crmContact?.fullName ?? chat.phoneNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chat.phoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>{chat.channel?.displayName ?? "-"}</TableCell>
                    <TableCell>{chat.agentId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={chat.mode === "human" ? "warning" : "default"}
                      >
                        {chat.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(chat.lastMessageAt)}</TableCell>
                    <TableCell className="max-w-sm truncate">
                      {chat.lastMessage}
                    </TableCell>
                    <TableCell>
                      <div className="grid min-w-80 gap-2">
                        <div className="flex gap-2">
                          <form action={takeoverChatAction}>
                            <input
                              type="hidden"
                              name="tenantId"
                              value={selectedTenant.id}
                            />
                            <input
                              type="hidden"
                              name="channelId"
                              value={chat.channelId}
                            />
                            <input
                              type="hidden"
                              name="phone"
                              value={chat.phoneNumber}
                            />
                            <Button type="submit" size="sm" variant="secondary">
                              Takeover
                            </Button>
                          </form>
                          <form action={releaseChatAction}>
                            <input
                              type="hidden"
                              name="tenantId"
                              value={selectedTenant.id}
                            />
                            <input
                              type="hidden"
                              name="channelId"
                              value={chat.channelId}
                            />
                            <input
                              type="hidden"
                              name="phone"
                              value={chat.phoneNumber}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Release
                            </Button>
                          </form>
                        </div>
                        <form
                          action={sendChatMessageAction}
                          className="grid grid-cols-[1fr_auto] gap-2"
                        >
                          <input
                            type="hidden"
                            name="tenantId"
                            value={selectedTenant.id}
                          />
                          <input
                            type="hidden"
                            name="channelId"
                            value={chat.channelId}
                          />
                          <input
                            type="hidden"
                            name="phone"
                            value={chat.phoneNumber}
                          />
                          <Input
                            name="body"
                            placeholder="Send WhatsApp message"
                          />
                          <Button type="submit" size="sm">
                            Send
                          </Button>
                        </form>
                      </div>
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
