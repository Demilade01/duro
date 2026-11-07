import type { BushaClient } from "@/lib/busha/client";
import type { TemporaryBankAccountPayIn } from "@/lib/busha/types";
import type { UserProfile } from "@/lib/db/schema";
import { latestPendingDeposit, recordTx } from "./ledger";

export type FundingSource = "EMPLOYER" | "POS_AGENT";

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string;
}

/** NGN (bank transfer) -> cNGN deposit via a Busha temporary virtual account. */
export async function createFundingAccount(
  busha: BushaClient,
  user: UserProfile,
  amountNgn: number,
  source: FundingSource,
) {
  const reference = `DURO-FUND-${Date.now()}`;
  const quote = await busha.createQuote({
    source_currency: "NGN",
    target_currency: "cNGN",
    source_amount: amountNgn.toFixed(2),
    pay_in: { type: "temporary_bank_account", channel: "bank_transfer" },
    pay_out: { type: "balance" },
    reference,
  });
  const transfer = await busha.createTransfer({ quote_id: quote.id, reference });
  const payIn = transfer.pay_in as TemporaryBankAccountPayIn;
  const virtualAccount: VirtualAccount = {
    bankName: payIn.bank_name,
    accountNumber: payIn.account_number,
    accountName: payIn.account_name,
    expiresAt: payIn.expires_at,
  };
  const tx = await recordTx({
    userId: user.id,
    kind: "DEPOSIT",
    direction: "IN",
    currency: "cNGN",
    amount: amountNgn,
    counterCurrency: "NGN",
    counterAmount: amountNgn,
    status: "pending",
    description: source === "EMPLOYER" ? "Salary deposit (awaiting transfer)" : "POS agent cash-in (awaiting transfer)",
    bushaTransferId: transfer.id,
    bushaQuoteId: quote.id,
    meta: { source, virtualAccount },
  });
  return { quote, transfer, virtualAccount, transaction: tx };
}

/** Re-use a still-valid pending deposit account, else create a fresh one. */
export async function getOrCreateFundingAccount(
  busha: BushaClient,
  user: UserProfile,
  amountNgn: number,
  source: FundingSource,
) {
  const pending = await latestPendingDeposit(user.id);
  const va = pending?.meta?.virtualAccount as VirtualAccount | undefined;
  if (pending?.bushaTransferId && va && Date.parse(va.expiresAt) > Date.now() + 60_000) {
    return { transferId: pending.bushaTransferId, virtualAccount: va, reused: true };
  }
  const created = await createFundingAccount(busha, user, amountNgn, source);
  return { transferId: created.transfer.id, virtualAccount: created.virtualAccount, reused: false };
}
