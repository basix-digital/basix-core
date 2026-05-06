"use client";

import { resolveErrorMessage } from "./errors";

export class ConsoleApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(resolveErrorMessage(payload));
  }
}

export async function consoleFetch<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      window.location.assign("/login");
    }

    throw new ConsoleApiError(response.status, payload);
  }

  return payload as T;
}
