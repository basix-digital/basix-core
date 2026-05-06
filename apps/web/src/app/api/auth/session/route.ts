import { NextResponse } from "next/server";
import { getSessionUser, refreshSession } from "@/lib/api/server";

export async function GET() {
  let user = await getSessionUser();

  if (!user) {
    await refreshSession();
    user = await getSessionUser();
  }

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
