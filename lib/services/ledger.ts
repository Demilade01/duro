import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transactions, type Transaction } from "@/lib/db/schema";

export type TxKind = "DEPOSIT" | "AUTO_SAVE" | "CONVERSION" | "PAYOUT" | "PLEDGE_ADVANCE";
export type TxDirection = "IN" | "OUT" | "INTERNAL";

export interface NewTx {
  userId: string;
  kind: TxKind;
  direction: TxDirection;
  currency: string;
  amount: number;
  counterCurrency?: string;
  counterAmount?: number;
  status: string;
  description: string;
  bushaTransferId?: string;
  bushaQuoteId?: string;
  recipientId?: string;
  meta?: Record<string, unknown>;
}

export async function recordTx(tx: NewTx): Promise<Transaction> {
  const [row] = await getDb().insert(transactions).values(tx).returning();
  return row;
}

export async function updateTxByTransferId(
  userId: string,
  bushaTransferId: string,
  patch: Partial<Pick<Transaction, "status" | "amount" | "counterAmount" | "meta" | "description">>,
): Promise<Transaction | null> {
  const [row] = await getDb()
    .update(transactions)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), eq(transactions.bushaTransferId, bushaTransferId)))
    .returning();
  return row ?? null;
}

export async function findTxByTransferId(userId: string, bushaTransferId: string) {
  const [row] = await getDb()
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.bushaTransferId, bushaTransferId)));
  return row ?? null;
}

export async function recentTransactions(userId: string, limit = 20) {
  return getDb()
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function latestPendingDeposit(userId: string) {
  const [row] = await getDb()
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.kind, "DEPOSIT"), eq(transactions.status, "pending")))
    .orderBy(desc(transactions.createdAt))
    .limit(1);
  return row ?? null;
}
