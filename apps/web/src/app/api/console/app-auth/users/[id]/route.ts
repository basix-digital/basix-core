import { NextResponse } from "next/server";
import { updateAppAuthUser } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { updateAppUserSchema } from "@/lib/api/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { id } = await context.params;
      const body = updateAppUserSchema.parse(await request.json());
      return NextResponse.json(await updateAppAuthUser(id, body));
    });
  } catch (error) {
    return backendJson(error);
  }
}
