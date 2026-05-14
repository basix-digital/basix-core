import { NextResponse } from "next/server";
import { processOverdueSubscriptions } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";

export async function POST() {
  try {
    return await withBackendSessionRefresh(async () =>
      NextResponse.json(await processOverdueSubscriptions()),
    );
  } catch (error) {
    return backendJson(error);
  }
}
