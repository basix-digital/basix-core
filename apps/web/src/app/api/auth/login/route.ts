import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { loginSchema } from "@/lib/api/validators";
import { backendJson, setSession } from "@/lib/api/server";
import type { AuthResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const response = await fetch(`${config.apiBaseUrl}/admin/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(body, { status: response.status });
    }

    const auth = body as AuthResponse;
    await setSession(auth);

    return NextResponse.json({ user: auth.user });
  } catch (error) {
    return backendJson(error);
  }
}
