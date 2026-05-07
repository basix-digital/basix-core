import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { REFRESH_COOKIE } from "@/lib/auth/session";
import { clearSession } from "@/lib/api/server";

export async function POST() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(REFRESH_COOKIE)?.value;

  if (sessionValue) {
    await fetch(`${config.apiBaseUrl}/admin/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ sessionValue }),
      cache: "no-store",
    }).catch(() => null);
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
