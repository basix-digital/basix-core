import { NextResponse } from "next/server";
import { revokeEnvironmentVariable } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { id } = await params;
      return NextResponse.json(await revokeEnvironmentVariable(id));
    });
  } catch (error) {
    return backendJson(error);
  }
}
