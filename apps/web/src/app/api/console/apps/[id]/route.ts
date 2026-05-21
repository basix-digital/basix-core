import { NextResponse } from "next/server";
import { updateApp } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { updateAppSchema } from "@/lib/api/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { id } = await context.params;
      const body = updateAppSchema.parse(await request.json());
      const app = await updateApp(id, {
        name: body.name || undefined,
        slug: body.slug || undefined,
        baseUrl: body.baseUrl === "" ? null : body.baseUrl,
        status: body.status,
      });

      return NextResponse.json(app);
    });
  } catch (error) {
    return backendJson(error);
  }
}
