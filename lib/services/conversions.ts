import type { BushaClient } from "@/lib/busha/client";
import type { UserProfile } from "@/lib/db/schema";
import { recordTx, type TxKind } from "./ledger";

export type ConversionDirection = "SPEND_TO_SAVE" | "SAVE_TO_SPEND";

/**
 * Balance <-> balance conversion between Spend (cNGN) and Save (USDC).
 * `amount` is denominated in the SOURCE currency (NGN for SPEND_TO_SAVE, USD for SAVE_TO_SPEND).
 */
export async function convertBetweenBalances(
  busha: BushaClient,
  user: UserProfile,
  direction: ConversionDirection,
  amount: number,
  kind: Extract<TxKind, "AUTO_SAVE" | "CONVERSION"> = "CONVERSION",
) {
  const toSave = direction === "SPEND_TO_SAVE";
  const reference = `DURO-${kind}-${Date.now()}`;
  const quote = await busha.createQuote({
    source_currency: toSave ? "cNGN" : "USDC",
    target_currency: toSave ? "USDC" : "cNGN",
    source_amount: amount.toFixed(2),
    pay_in: { type: "balance" },
    pay_out: { type: "balance" },
    reference,
  });
  const transfer = await busha.createTransfer({ quote_id: quote.id, reference });
  const sourceAmount = Number(transfer.source_amount);
  const targetAmount = Number(transfer.target_amount);

  const description =
    kind === "AUTO_SAVE"
      ? `Auto-saved ${user.autoSavePercent}% to dollars`
      : toSave
        ? "Moved to Save (dollars)"
        : "Moved to Spend (naira)";

  const transaction = await recordTx({
    userId: user.id,
    kind,
    direction: "INTERNAL",
    currency: toSave ? "USDC" : "cNGN",
    amount: targetAmount,
    counterCurrency: toSave ? "cNGN" : "USDC",
    counterAmount: sourceAmount,
    status: transfer.status,
    description,
    bushaTransferId: transfer.id,
    bushaQuoteId: quote.id,
    meta: { rate: quote.rate.rate, timeline: transfer.timeline },
  });
  return { quote, transfer, transaction };
}
