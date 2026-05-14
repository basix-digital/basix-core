import { NextResponse } from "next/server";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { getDashboardOverview } from "@/lib/api/console";

export async function GET() {
  try {
    return await withBackendSessionRefresh(async () =>
      NextResponse.json(await getDashboardOverview()),
    );
  } catch (error) {
    return backendJson(error);
  }
}
