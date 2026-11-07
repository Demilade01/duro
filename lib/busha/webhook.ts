import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { BushaTransfer, BushaWebhookEvent } from "./types";

function secret(): string {
  const s = process.env.BUSHA_WEBHOOK_SECRET;
  if (!s) throw new Error("BUSHA_WEBHOOK_SECRET is not set");
  return s;
}

/** Hex HMAC-SHA256 over the exact raw request body. */
export function signWebhook(rawBody: string): string {
  return createHmac("sha256", secret()).update(rawBody, "utf8").digest("hex");
}

/** Constant-time verification. Accepts `<hex>` or `sha256=<hex>`. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const provided = signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = Buffer.from(signWebhook(rawBody), "hex");
  const actual = Buffer.from(provided, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function buildWebhookEvent(
  event: BushaWebhookEvent["event"],
  transfer: BushaTransfer,
): BushaWebhookEvent {
  return { id: `EVT_${randomUUID()}`, event, created_at: new Date().toISOString(), data: transfer };
}
