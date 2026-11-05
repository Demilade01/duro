import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { processedWebhooks } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/busha/webhook";
import type { BushaMode, BushaTransfer, BushaWebhookEvent } from "@/lib/busha/types";
import { DuroError } from "@/lib/errors";
import { logApi } from "@/lib/telemetry";
import { processWebhookEvent, type WebhookProcessingResult } from "./deposits";

export interface WebhookIntakeResult {
  received: true;
  duplicate: boolean;
  eventId: string;
  result: WebhookProcessingResult | null;
}

/**
 * Verify signature -> dedupe -> process. Shared by the HTTP route and the
 * in-process fallback used by the salary simulator.
 */
export async function intakeWebhook(
  rawBody: string,
  signature: string | null,
  mode: BushaMode,
): Promise<WebhookIntakeResult> {
  const started = Date.now();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    /* handled below */
  }
  const headers = { "x-bu-signature": signature ? `${signature.slice(0, 12)}…` : "(missing)" };

  if (!verifyWebhookSignature(rawBody, signature)) {
    await logApi({
      direction: "INCOMING_WEBHOOK", mode, method: "POST", path: "/api/webhooks/busha", status: 401,
      durationMs: Date.now() - started, requestHeaders: headers, requestBody: parsed,
      responseBody: { error: "INVALID_SIGNATURE" }, note: "Rejected: HMAC-SHA256 signature mismatch",
    });
    throw new DuroError("INVALID_SIGNATURE", "Invalid x-bu-signature", 401);
  }

  const event = parsed as BushaWebhookEvent<BushaTransfer> | null;
  if (!event?.id || !event.event || !event.data?.id) {
    throw new DuroError("VALIDATION", "Malformed webhook event", 400);
  }

  const db = getDb();
  const inserted = await db
    .insert(processedWebhooks)
    .values({ id: event.id, eventType: event.event })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) {
    await logApi({
      direction: "INCOMING_WEBHOOK", mode, method: "POST", path: "/api/webhooks/busha", status: 200,
      durationMs: Date.now() - started, profileId: event.data.profile_id, requestHeaders: headers,
      requestBody: event, responseBody: { duplicate: true }, note: `Duplicate ${event.event} ignored`,
    });
    return { received: true, duplicate: true, eventId: event.id, result: null };
  }

  try {
    const result = await processWebhookEvent(event, mode);
    await logApi({
      direction: "INCOMING_WEBHOOK", mode, method: "POST", path: "/api/webhooks/busha", status: 200,
      durationMs: Date.now() - started, profileId: event.data.profile_id, requestHeaders: headers,
      requestBody: event, responseBody: result, note: `${event.event} ✓ signature verified`,
    });
    return { received: true, duplicate: false, eventId: event.id, result };
  } catch (err) {
    // Allow Busha to retry: forget the event if processing failed.
    await db.delete(processedWebhooks).where(eq(processedWebhooks.id, event.id));
    throw err;
  }
}
