import { NextResponse } from "next/server";
import {
  createAppAuthInvitation,
  listAppAuthInvitations,
} from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { createAppInvitationSchema } from "@/lib/api/validators";

export async function GET(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const url = new URL(request.url);
      return NextResponse.json(
        await listAppAuthInvitations({
          tenantId: url.searchParams.get("tenantId") ?? "",
          appId: url.searchParams.get("appId") || undefined,
          status: url.searchParams.get("status") || undefined,
        }),
      );
    });
  } catch (error) {
    return backendJson(error);
  }
}

export async function POST(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const body = createAppInvitationSchema.parse(await request.json());
      return NextResponse.json(await createAppAuthInvitation(body), {
        status: 201,
      });
    });
  } catch (error) {
    return backendJson(error);
  }
}
