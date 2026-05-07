import { NextResponse } from "next/server";
import { createApiToken } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";
import { createApiTokenSchema } from "@/lib/api/validators";

export async function POST(request: Request) {
  try {
    const body = createApiTokenSchema.parse(await request.json());
    const token = await createApiToken({
      appId: body.appId,
      name: body.name || undefined,
      scopes: body.scopes,
      expiresAt: body.expiresAt || undefined,
    });

    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    return backendJson(error);
  }
}
