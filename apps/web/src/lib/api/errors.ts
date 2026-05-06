import type { ApiEnvelopeError } from "./types";

export function resolveErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as ApiEnvelopeError).message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (message) {
      return message;
    }
  }

  return "Request failed";
}
