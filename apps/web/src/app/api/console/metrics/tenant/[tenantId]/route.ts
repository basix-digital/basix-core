import { NextResponse } from "next/server";
import { getTenantMetrics } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";
import { metricsQuerySchema } from "@/lib/api/validators";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantId } = await context.params;
    const url = new URL(request.url);
    const query = metricsQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    return NextResponse.json(await getTenantMetrics(tenantId, query));
  } catch (error) {
    return backendJson(error);
  }
}
