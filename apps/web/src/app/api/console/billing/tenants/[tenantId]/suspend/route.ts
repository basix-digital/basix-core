import { NextResponse } from "next/server";
import { suspendTenant } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { tenantId } = await context.params;
    return NextResponse.json(await suspendTenant(tenantId));
  } catch (error) {
    return backendJson(error);
  }
}
