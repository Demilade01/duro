import { eq } from "drizzle-orm";
import { BushaClient } from "@/lib/busha/client";
import type { BushaMode, BushaTransfer, BushaWebhookEvent } from "@/lib/busha/types";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { round2 } from "@/lib/money";
import { convertBetweenBalances } from "./conversions";
import { findTxByTransferId, recordTx, updateTxByTransferId } from "./ledger";

export interface AutoSaveResult {
  percent: number;
  ngn: number;
  usdc: number;
  transferId: string | null;
  error?: string;
}

export interface WebhookProcessingResult {
  event: string;
  handled: boolean;
  reason?: string;
  credited?: number;
  autoSave?: AutoSaveResult | null;
}

/** Handles a verified Busha webhook event. Pure business logic, no HTTP. */
export async function processWebhookEvent(
  event: BushaWebhookEvent<BushaTransfer>,
  mode: BushaMode,
): Promise<WebhookProcessingResult> {
  const transfer = event.data;
  const db = getDb();
  let [user] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.bushaProfileId, transfer.profile_id));

  if (!user) {
    // Fallback when switching between MOCK and LIVE profiles on the same demo account
    const allUsers = await db.select().from(userProfiles);
    user = allUsers[0];
  }
  if (!user) return { event: event.event, handled: false, reason: `Unknown profile ${transfer.profile_id}` };

  if (event.event !== "transfer.funds_received") {
    await updateTxByTransferId(user.id, transfer.id, { status: transfer.status });
    return { event: event.event, handled: true };
  }

  // 1) Credit: record the salary / POS inflow on Spend (cNGN)
  const credited = Number(transfer.target_amount);
  const existing = await findTxByTransferId(user.id, transfer.id);
  const source = (existing?.meta?.source as string | undefined) ?? "EMPLOYER";
  const description = source === "POS_AGENT" ? "POS agent cash-in" : "Salary received";
  if (existing) {
    await updateTxByTransferId(user.id, transfer.id, {
      status: "funds_received",
      amount: credited,
      counterAmount: Number(transfer.source_amount),
      description,
      meta: { ...(existing.meta ?? {}), webhookEventId: event.id },
    });
  } else {
    await recordTx({
      userId: user.id,
      kind: "DEPOSIT",
      direction: "IN",
      currency: "cNGN",
      amount: credited,
      counterCurrency: "NGN",
      counterAmount: Number(transfer.source_amount),
      status: "funds_received",
      description,
      bushaTransferId: transfer.id,
      meta: { webhookEventId: event.id, source },
    });
  }

  // 2) Auto-split: convert autoSavePercent of the inflow into USDC
  const percent = user.autoSavePercent;
  const saveNgn = round2((credited * percent) / 100);
  let autoSave: AutoSaveResult | null = null;
  if (percent > 0 && saveNgn >= 1) {
    const busha = new BushaClient({ mode, profileId: user.bushaProfileId });
    try {
      const { transfer: conv } = await convertBetweenBalances(busha, user, "SPEND_TO_SAVE", saveNgn, "AUTO_SAVE");
      autoSave = { percent, ngn: Number(conv.source_amount), usdc: Number(conv.target_amount), transferId: conv.id };
    } catch (err) {
      // The deposit is already credited; don't make Busha retry the webhook.
      autoSave = { percent, ngn: saveNgn, usdc: 0, transferId: null, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { event: event.event, handled: true, credited, autoSave };
}
