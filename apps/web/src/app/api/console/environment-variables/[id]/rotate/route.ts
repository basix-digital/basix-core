import { NextResponse } from "next/server";
import { rotateEnvironmentVariable } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { rotateEnvironmentVariableSchema } from "@/lib/api/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { id } = await params;
      const body = rotateEnvironmentVariableSchema.parse(await request.json());

      return NextResponse.json(
        await rotateEnvironmentVariable(id, { value: body.value }),
      );
    });
  } catch (error) {
    return backendJson(error);
  }
}
