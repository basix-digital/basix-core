import { NextResponse } from "next/server";
import { resendAppAuthInvitation } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { id } = await context.params;
      return NextResponse.json(await resendAppAuthInvitation(id));
    });
  } catch (error) {
    return backendJson(error);
  }
}
