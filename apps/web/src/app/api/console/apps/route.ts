import { NextResponse } from "next/server";
import {
  createApp,
  getAllApps,
  listApps,
  listTenants,
} from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";
import { createAppSchema } from "@/lib/api/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");
    const tenants = await listTenants();
    const apps = tenantId
      ? await listApps(tenantId)
      : await getAllApps(tenants);

    return NextResponse.json({
      data: apps,
      tenants,
    });
  } catch (error) {
    return backendJson(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createAppSchema.parse(await request.json());
    const app = await createApp({
      tenantId: body.tenantId,
      name: body.name,
      slug: body.slug || undefined,
      baseUrl: body.baseUrl || undefined,
    });

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return backendJson(error);
  }
}
