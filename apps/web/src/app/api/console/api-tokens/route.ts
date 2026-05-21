import { NextResponse } from "next/server";
import { createApiToken, listApiTokens } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { createApiTokenSchema } from "@/lib/api/validators";

export async function GET(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const url = new URL(request.url);
      const tokens = await listApiTokens({
        tenantId: url.searchParams.get("tenantId") ?? "",
        appId: url.searchParams.get("appId") || undefined,
        status: url.searchParams.get("status") || undefined,
      });

      return NextResponse.json(tokens);
    });
  } catch (error) {
    return backendJson(error);
  }
}

export async function POST(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const body = createApiTokenSchema.parse(await request.json());
      const token = await createApiToken({
        appId: body.appId,
        name: body.name || undefined,
        scopes: body.scopes,
        expiresAt: body.expiresAt || undefined,
      });

      return NextResponse.json(token, { status: 201 });
    });
  } catch (error) {
    return backendJson(error);
  }
}
