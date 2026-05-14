import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api/server";

export async function GET() {
  const user = await getSessionUser({ refresh: true });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
