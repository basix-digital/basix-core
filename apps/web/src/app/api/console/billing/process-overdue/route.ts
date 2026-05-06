import { NextResponse } from "next/server";
import { processOverdueSubscriptions } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";

export async function POST() {
  try {
    return NextResponse.json(await processOverdueSubscriptions());
  } catch (error) {
    return backendJson(error);
  }
}
