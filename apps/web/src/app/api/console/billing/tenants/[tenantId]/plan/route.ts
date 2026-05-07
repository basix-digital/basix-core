import { NextResponse } from "next/server";
import { planKeySchema } from "@basix-core/shared";
import { changeTenantPlan } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantId } = await context.params;
    const body = await request.json();
    const plan = planKeySchema.parse(body.plan);

    return NextResponse.json(await changeTenantPlan(tenantId, plan));
  } catch (error) {
    return backendJson(error);
  }
}
