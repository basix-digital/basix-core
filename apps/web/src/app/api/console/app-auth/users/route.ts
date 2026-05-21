import { NextResponse } from "next/server";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { listAppAuthUsers } from "@/lib/api/console";

export async function GET(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const url = new URL(request.url);
      return NextResponse.json(
        await listAppAuthUsers({
          tenantId: url.searchParams.get("tenantId") ?? "",
          appId: url.searchParams.get("appId") || undefined,
          status: url.searchParams.get("status") || undefined,
          search: url.searchParams.get("search") || undefined,
        }),
      );
    });
  } catch (error) {
    return backendJson(error);
  }
}
