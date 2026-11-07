import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trustedRecipients, type TrustedRecipient, type UserProfile } from "@/lib/db/schema";
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

export async function getUserRecipients(userId: string) {
  return getDb().select().from(trustedRecipients).where(eq(trustedRecipients.userId, userId));
}

export async function buildWalletSnapshot(ctx: RequestContext) {
  const { user, busha } = ctx;
  let balances: ReturnType<typeof summarizeBalances> | null = null;
  let balancesError: string | null = null;
  try {
    balances = summarizeBalances(await busha.getBalances());
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
