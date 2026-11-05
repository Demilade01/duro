import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { trustedRecipients, type TrustedRecipient } from "@/lib/db/schema";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody } from "@/lib/http";
import { enforceVelocityGuard } from "@/lib/security/velocity-guard";
import { findTxByTransferId, recordTx, updateTxByTransferId } from "@/lib/services/ledger";
import { publicRecipient } from "@/lib/services/wallet";

const NewRecipient = z.object({
  label: z.string().trim().min(2),
  bankName: z.string().trim().min(2),
  bankCode: z.string().regex(/^\d{3,6}$/, "Invalid bank code"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  accountName: z.string().trim().min(3),
});

const Body = z
  .object({
    recipientId: z.string().optional(),
    newRecipient: NewRecipient.optional(),
    amountNgn: z.number().min(100).max(5_000_000),
    narration: z.string().max(100).optional(),
  })
  .refine((b) => !!b.recipientId !== !!b.newRecipient, {
    message: "Provide exactly one of recipientId or newRecipient",
  });

/** Send NGN home: cNGN -> NGN bank payout with a live 4-stage timeline. */
export const POST = handler(async (req) => {
  const ctx = await getContext(req);
  const body = await parseBody(req, Body);
  const db = getDb();
  const { user, busha } = ctx;

  // Resolve the recipient (existing id, or dedupe a "new" one by bank+account)
  let recipient: TrustedRecipient | null = null;
  if (body.recipientId) {
    [recipient] = await db
      .select()
      .from(trustedRecipients)
      .where(and(eq(trustedRecipients.id, body.recipientId), eq(trustedRecipients.userId, user.id)));
    if (!recipient) throw new DuroError("NOT_FOUND", "Recipient not found", 404);
  } else if (body.newRecipient) {
    [recipient] = await db
      .select()
      .from(trustedRecipients)
      .where(
        and(
          eq(trustedRecipients.userId, user.id),
          eq(trustedRecipients.bankCode, body.newRecipient.bankCode),
          eq(trustedRecipients.accountNumber, body.newRecipient.accountNumber),
        ),
      );
    recipient ??= null;
  }

  // SIM-swap guard: under lock, only pre-existing verified recipients are allowed.
  await enforceVelocityGuard(
    user,
    { type: "REMIT", recipient: recipient ? { label: recipient.label, isPreVerified: recipient.isPreVerified } : null },
    ctx,
  );

  if (!recipient && body.newRecipient) {
    const nr = body.newRecipient;
    const rcp = await busha.createRecipient({
      name: nr.label,
      details: { bank_code: nr.bankCode, bank_name: nr.bankName, account_number: nr.accountNumber, account_name: nr.accountName },
    });
    [recipient] = await db
      .insert(trustedRecipients)
      .values({ userId: user.id, bushaRecipientId: rcp.id, ...nr, isPreVerified: true })
      .onConflictDoUpdate({ target: trustedRecipients.bushaRecipientId, set: { label: nr.label } })
      .returning();
  }
  if (!recipient) throw new DuroError("NOT_FOUND", "Recipient not found", 404);

  const reference = `DURO-REMIT-${Date.now()}`;
  const quote = await busha.createQuote({
    source_currency: "cNGN",
    target_currency: "NGN",
    source_amount: body.amountNgn.toFixed(2),
    pay_in: { type: "balance" },
    pay_out: { type: "bank_transfer", recipient_id: recipient.bushaRecipientId },
    reference,
  });
  const transfer = await busha.createTransfer({ quote_id: quote.id, reference });

  const transaction = await recordTx({
    userId: user.id,
    kind: "PAYOUT",
    direction: "OUT",
    currency: "cNGN",
    amount: Number(transfer.source_amount),
    counterCurrency: "NGN",
    counterAmount: Number(transfer.target_amount),
    status: transfer.status,
    description: `Sent to ${recipient.label}`,
    bushaTransferId: transfer.id,
    bushaQuoteId: quote.id,
    recipientId: recipient.id,
    meta: { narration: body.narration ?? null, timeline: transfer.timeline },
  });

  return ok({ transfer, transaction, recipient: publicRecipient(recipient) }, 201);
});

/** Poll a payout's live timeline: GET /api/remit?transferId=TRF_... */
export const GET = handler(async (req) => {
  const ctx = await getContext(req);
  const transferId = new URL(req.url).searchParams.get("transferId");
  if (!transferId) throw new DuroError("VALIDATION", "transferId query param is required", 400);
  const transfer = await ctx.busha.getTransfer(transferId);
  const existing = await findTxByTransferId(ctx.user.id, transferId);
  const transaction = existing
    ? await updateTxByTransferId(ctx.user.id, transferId, {
        status: transfer.status,
        meta: { ...(existing.meta ?? {}), timeline: transfer.timeline },
      })
    : null;
  return ok({ transfer, transaction });
});
