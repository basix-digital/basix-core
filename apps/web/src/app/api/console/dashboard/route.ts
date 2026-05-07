import { NextResponse } from "next/server";
import { backendJson } from "@/lib/api/server";
import { getDashboardOverview } from "@/lib/api/console";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardOverview());
  } catch (error) {
    return backendJson(error);
  }
}
