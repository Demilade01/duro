import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { trustedRecipients } from "@/lib/db/schema";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody } from "@/lib/http";
import { isLocked } from "@/lib/security/velocity-guard";
import { getUserRecipients, publicRecipient } from "@/lib/services/wallet";
import { logApi } from "@/lib/telemetry";

const CreateRecipientBody = z.object({
  label: z.string().trim().min(2),
  bankName: z.string().trim().min(2),
  bankCode: z.string().regex(/^\d{3,6}$/, "Invalid bank code"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  accountName: z.string().trim().min(3),
});

const DeleteRecipientBody = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/recipients
 * Returns the current user's trusted beneficiaries.
 */
export const GET = handler(async (req) => {
  const ctx = await getContext(req);
  const recipients = await getUserRecipients(ctx.user.id);
  return ok({ recipients: recipients.map(publicRecipient) });
});

/**
 * POST /api/recipients
 * Adds a new pre-verified trusted beneficiary.
 *
 * ANTI-COERCION RULE:
 * If the 24-hour cooling-off lock is active, new beneficiaries CANNOT be added
 * under any circumstances to prevent physical hold-ups, forced selfies, or mule transfers.
 */
export const POST = handler(async (req) => {
  const ctx = await getContext(req);
  const { user, busha } = ctx;

  if (isLocked(user)) {
    const until = user.simSwapLockedUntil!.toISOString();
    await logApi({
      direction: "GUARD",
      mode: ctx.mode,
      method: "BLOCK",
      path: "recipients/create",
      status: 423,
      profileId: user.bushaProfileId,
      requestHeaders: { "x-device-id": ctx.deviceId ?? "(none)" },
      responseBody: { code: "RECIPIENT_ADDITION_LOCKED", lockedUntil: until },
      note: "Blocked attempt to add a new beneficiary while 24h cooling-off lock is active (anti-coercion protection)",
    });
    throw new DuroError(
      "RECIPIENT_ADDITION_LOCKED",
      "For your safety against coercion and theft, new beneficiaries cannot be added while your account is in a 24-hour cooling-off period.",
      423,
      { lockedUntil: until },
    );
  }

  const body = await parseBody(req, CreateRecipientBody);
  const db = getDb();

  // Deduplicate if already saved for this user
  const [existing] = await db
    .select()
    .from(trustedRecipients)
    .where(
      and(
        eq(trustedRecipients.userId, user.id),
        eq(trustedRecipients.bankCode, body.bankCode),
        eq(trustedRecipients.accountNumber, body.accountNumber),
      ),
    );

  if (existing) {
    return ok({ recipient: publicRecipient(existing), created: false });
  }

  // Create recipient on Busha
  const rcp = await busha.createRecipient({
    name: body.label,
    details: {
      bank_code: body.bankCode,
      bank_name: body.bankName,
      account_number: body.accountNumber,
      account_name: body.accountName,
    },
  });

  const [created] = await db
    .insert(trustedRecipients)
    .values({
      userId: user.id,
      bushaRecipientId: rcp.id,
      label: body.label,
      bankName: body.bankName,
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      isPreVerified: true,
    })
    .onConflictDoUpdate({
      target: trustedRecipients.bushaRecipientId,
      set: { label: body.label },
    })
    .returning();

  await logApi({
    direction: "OUTGOING",
    mode: ctx.mode,
    method: "CREATE_RECIPIENT",
    path: "recipients/create",
    status: 200,
    profileId: user.bushaProfileId,
    requestHeaders: { "x-device-id": ctx.deviceId ?? "(none)" },
    responseBody: { recipientId: created.id, bushaRecipientId: created.bushaRecipientId },
    note: `Added trusted beneficiary ${created.label} (${created.bankName})`,
  });

  return ok({ recipient: publicRecipient(created), created: true });
});

/**
 * DELETE /api/recipients
 * Deletes a trusted beneficiary. Disabled during 24h cooling-off lock.
 */
export const DELETE = handler(async (req) => {
  const ctx = await getContext(req);
  const { user } = ctx;

  if (isLocked(user)) {
    throw new DuroError(
      "RECIPIENT_MUTATION_LOCKED",
      "Beneficiary settings cannot be modified while your account is in a 24-hour cooling-off period.",
      423,
    );
  }

  const body = await parseBody(req, DeleteRecipientBody);
  const db = getDb();

  const [deleted] = await db
    .delete(trustedRecipients)
    .where(and(eq(trustedRecipients.id, body.id), eq(trustedRecipients.userId, user.id)))
    .returning();

  if (!deleted) {
    throw new DuroError("NOT_FOUND", "Recipient not found", 404);
  }

  return ok({ deleted: true, id: deleted.id });
});
