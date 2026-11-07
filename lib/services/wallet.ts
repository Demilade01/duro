import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transactions, trustedRecipients, type TrustedRecipient, type UserProfile } from "@/lib/db/schema";
import type { BushaBalance } from "@/lib/busha/types";
import type { RequestContext } from "@/lib/context";
import { USD_NGN_RATE, round2 } from "@/lib/money";
import { recentLogs } from "@/lib/telemetry";
import { recentTransactions } from "./ledger";

export function publicProfile(user: UserProfile) {
  return {
    id: user.id,
    fullName: user.fullName,
    firstName: user.fullName.split(" ")[0],
    phone: user.phone,
    email: user.email,
    ninMasked: `•••••••${user.nin.slice(-4)}`,
    kycStatus: user.kycStatus,
    autoSavePercent: user.autoSavePercent,
    bushaProfileId: user.bushaProfileId,
    trustedDeviceId: user.trustedDeviceId,
    createdAt: user.createdAt.toISOString(),
  };
}

export function publicRecipient(r: TrustedRecipient) {
  return {
    id: r.id,
    bushaRecipientId: r.bushaRecipientId,
    label: r.label,
    bankName: r.bankName,
    bankCode: r.bankCode,
    accountNumber: r.accountNumber,
    accountNumberMasked: `******${r.accountNumber.slice(-4)}`,
    accountName: r.accountName,
    isPreVerified: r.isPreVerified,
  };
}

export function summarizeBalances(raw: BushaBalance[]) {
  const find = (c: string) => raw.find((b) => b.currency === c);
  const cngn = find("cNGN");
  const usdc = find("USDC");
  const usdcAvailable = Number(usdc?.available_balance ?? 0);
  const usdcLocked = Number(usdc?.pending_balance ?? 0);
  const usdcTotal = Number(usdc?.total_balance ?? 0);
  return {
    spend: {
      currency: "cNGN" as const,
      available: Number(cngn?.available_balance ?? 0),
      pending: Number(cngn?.pending_balance ?? 0),
      total: Number(cngn?.total_balance ?? 0),
    },
    save: {
      currency: "USDC" as const,
      available: usdcAvailable,
      locked: usdcLocked,
      total: usdcTotal,
      ngnEquivalent: round2(usdcTotal * USD_NGN_RATE),
    },
    raw,
  };
}

export async function getUserBalances(ctx: Pick<RequestContext, "user" | "busha" | "mode">) {
  const raw = await ctx.busha.getBalances();
  if (ctx.mode === "MOCK") {
    return summarizeBalances(raw);
  }

  // In LIVE mode, a single Busha Sandbox API key shares one global float across all users.
  // We still call `busha.getBalances()` above for live API verification & telemetry,
  // and compute each Duro user's personal sub-wallet balances from their own ledger rows
  // so every new account starts cleanly at ₦0.00 Spend / $0.00 Save.
  const userTxs = await getDb()
    .select()
    .from(transactions)
    .where(eq(transactions.userId, ctx.user.id));

  let cngnAvailable = 0;
  let cngnPending = 0;
  let usdcAvailable = 0;
  let usdcLocked = 0;

  for (const tx of userTxs) {
    const amt = Number(tx.amount) || 0;
    const counter = Number(tx.counterAmount) || 0;

    if (tx.kind === "DEPOSIT") {
      if (tx.status === "funds_received" || tx.status === "completed") {
        cngnAvailable += amt;
      } else if (tx.status === "pending") {
        cngnPending += amt;
      }
    } else if (tx.kind === "AUTO_SAVE" || tx.kind === "CONVERSION") {
      if (tx.currency === "USDC") {
        // SPEND_TO_SAVE: cNGN -> USDC
        cngnAvailable -= counter;
        usdcAvailable += amt;
      } else if (tx.currency === "cNGN") {
        // SAVE_TO_SPEND: USDC -> cNGN
        usdcAvailable -= counter;
        cngnAvailable += amt;
      }
    } else if (tx.kind === "PAYOUT") {
      if (tx.status !== "failed" && tx.status !== "cancelled") {
        cngnAvailable -= amt;
      }
    } else if (tx.kind === "PLEDGE_ADVANCE") {
      if (tx.status !== "failed" && tx.status !== "cancelled") {
        cngnAvailable += amt;
        usdcAvailable -= counter;
        usdcLocked += counter;
      }
    }
  }

  cngnAvailable = Math.max(0, round2(cngnAvailable));
  cngnPending = Math.max(0, round2(cngnPending));
  const cngnTotal = round2(cngnAvailable + cngnPending);

  usdcAvailable = Math.max(0, round2(usdcAvailable));
  usdcLocked = Math.max(0, round2(usdcLocked));
  const usdcTotal = round2(usdcAvailable + usdcLocked);

  const scopedRaw: BushaBalance[] = [
    {
      currency: "cNGN",
      name: "cNGN (Naira Stablecoin)",
      is_fiat: false,
      available_balance: cngnAvailable.toFixed(2),
      pending_balance: cngnPending.toFixed(2),
      total_balance: cngnTotal.toFixed(2),
    },
    {
      currency: "USDC",
      name: "USD Coin",
      is_fiat: false,
      available_balance: usdcAvailable.toFixed(2),
      pending_balance: usdcLocked.toFixed(2),
      total_balance: usdcTotal.toFixed(2),
    },
    ...raw.filter((b) => b.currency !== "cNGN" && b.currency !== "USDC"),
  ];

  return summarizeBalances(scopedRaw);
}

export async function getUserRecipients(userId: string) {
  return getDb().select().from(trustedRecipients).where(eq(trustedRecipients.userId, userId));
}

export async function buildWalletSnapshot(ctx: RequestContext) {
  const { user } = ctx;
  let balances: ReturnType<typeof summarizeBalances> | null = null;
  let balancesError: string | null = null;
  try {
    balances = await getUserBalances(ctx);
  } catch (err) {
    balancesError = err instanceof Error ? err.message : String(err);
  }

  const [recipients, txs, logs] = await Promise.all([
    getUserRecipients(user.id),
    recentTransactions(user.id, 20),
    recentLogs(50),
  ]);

  return {
    profile: publicProfile(user),
    mode: ctx.mode,
    device: { id: ctx.deviceId, trusted: ctx.lock.deviceTrusted },
    lock: ctx.lock,
    rate: { usdNgn: USD_NGN_RATE },
    balances,
    balancesError,
    recipients: recipients.map(publicRecipient),
    transactions: txs,
    logs,
  };
}
