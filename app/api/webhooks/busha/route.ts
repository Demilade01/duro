import { resolveMode } from "@/lib/busha/client";
import { handler, ok } from "@/lib/http";
import { intakeWebhook } from "@/lib/services/webhook-intake";

/** Busha -> Duro webhook receiver. Verifies HMAC-SHA256 `x-bu-signature` over the raw body. */
export const POST = handler(async (req) => {
  const raw = await req.text();
  const result = await intakeWebhook(
    raw,
    req.headers.get("x-bu-signature"),
    resolveMode(req.headers.get("x-busha-mode")),
  );
  return ok(result);
});
