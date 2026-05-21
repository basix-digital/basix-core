import { NextResponse } from "next/server";
import { revokeApiToken } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";

export async function POST(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const body = (await request.json()) as { apiTokenId?: string };
      return NextResponse.json(await revokeApiToken(body.apiTokenId ?? ""));
    });
  } catch (error) {
    return backendJson(error);
  }
}
