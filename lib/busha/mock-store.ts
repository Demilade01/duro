/**
 * MockBushaStore — a deterministic, stateful re-implementation of the Busha
 * B2B2C API surface used by Duro. State is persisted per Busha profile as a
 * JSONB document in Neon (`mock_busha_state`), so MOCK mode survives restarts
 * and works on serverless deployments.
 *
 * Every mutation runs inside a Postgres transaction with `SELECT … FOR UPDATE`
 * so concurrent requests (e.g. webhook + UI) can never double-spend.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { mockBushaState } from "@/lib/db/schema";
import {
  USD_NGN_RATE,
  fromMinor,
  ngnToUsdMinor,
  toMinor,
  usdToNgnMinor,
} from "@/lib/money";
import type {
  BushaBalance,
  BushaCustomer,
  BushaPledge,
  BushaPledgeQuote,
  BushaQuote,
  BushaRate,
  BushaRecipient,
  BushaTransfer,
  BushaTrends,
  BushaVerification,
  CreateIndividualCustomerPayload,
  CreatePledgeQuotePayload,
  CreateQuotePayload,
  CreateRecipientPayload,
  CreateTransferPayload,
  Currency,
  TimelineEvent,
  TransferStatus,
  TrendsPoint,
  VerifyCustomerPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const QUOTE_TTL_MS = 2 * 60 * 1000;
const TEMP_ACCOUNT_TTL_MS = 60 * 60 * 1000;
const PLEDGE_QUOTE_TTL_MS = 5 * 60 * 1000;
const PLEDGE_MAX_LTV = 0.7;
const PAYOUT_STAGE_MS = Number(process.env.DURO_PAYOUT_STAGE_MS ?? "2000");

const CURRENCY_META: Record<Currency, { name: string; is_fiat: boolean }> = {
  cNGN: { name: "cNGN (Naira Stablecoin)", is_fiat: false },
  USDC: { name: "USD Coin", is_fiat: false },
  NGN: { name: "Nigerian Naira", is_fiat: true },
};

const PAYOUT_STAGES: { status: TransferStatus; label: string }[] = [
  { status: "pending", label: "Transfer initiated" },
  { status: "processing", label: "Processing with Busha" },
  { status: "outgoing_payment_sent", label: "Sent to recipient bank (NIP)" },
  { status: "funds_delivered", label: "Funds delivered" },
];

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface BalanceSlot {
  available: number; // minor units
  locked: number; // minor units (pledge collateral / pending)
}

interface LedgerEntry {
  at: string;
  direction: "in" | "out";
  ngnMinor: number;
  kind: string;
}

interface StoredTransfer extends BushaTransfer {
  /** When set, status/timeline advance with wall-clock time (payouts). */
  progressiveStartMs?: number;
}

interface MockState {
  version: 1;
  customer: BushaCustomer | null;
  verifications: BushaVerification[];
  balances: Record<Currency, BalanceSlot>;
  quotes: Record<string, BushaQuote>;
  transfers: Record<string, StoredTransfer>;
  recipients: Record<string, BushaRecipient>;
  pledgeQuotes: Record<string, BushaPledgeQuote>;
  pledges: Record<string, BushaPledge>;
  ledger: LedgerEntry[];
}

function emptyState(): MockState {
  return {
    version: 1,
    customer: null,
    verifications: [],
    balances: {
      cNGN: { available: 0, locked: 0 },
      USDC: { available: 0, locked: 0 },
      NGN: { available: 0, locked: 0 },
    },
    quotes: {},
    transfers: {},
    recipients: {},
    pledgeQuotes: {},
    pledges: {},
    ledger: [],
  };
}

// ---------------------------------------------------------------------------
// Errors & helpers
// ---------------------------------------------------------------------------

class MockError extends Error {
  constructor(
    public status: number,
    public errorName: string,
    message: string,
  ) {
    super(message);
  }
}

const notFound = (what: string) =>
  new MockError(404, "not_found", `${what} not found`);
const invalid = (msg: string) => new MockError(400, "validation_error", msg);

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url").replace(/[-_]/g, "X").toUpperCase()}`;
}

const iso = (ms = Date.now()) => new Date(ms).toISOString();

function parseAmount(value: unknown, field: string): number {
  if (typeof value !== "string" && typeof value !== "number") {
    throw invalid(`${field} is required`);
  }
  const minor = toMinor(value);
  if (!Number.isFinite(minor) || minor <= 0) {
    throw invalid(`${field} must be a positive amount`);
  }
  return minor;
}

function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") throw invalid("Request body required");
  return body as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function readState(profileId: string): Promise<MockState> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mockBushaState)
    .where(eq(mockBushaState.profileId, profileId));
  if (!row) throw notFound(`Profile ${profileId}`);
  return row.state as MockState;
}

async function mutateState<T>(
  profileId: string,
  fn: (state: MockState) => T,
  opts: { create?: boolean } = {},
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    if (opts.create) {
      await tx
        .insert(mockBushaState)
        .values({ profileId, state: emptyState() })
        .onConflictDoNothing();
    }
    const [row] = await tx
      .select()
      .from(mockBushaState)
      .where(eq(mockBushaState.profileId, profileId))
      .for("update");
    if (!row) throw notFound(`Profile ${profileId}`);
    const state = row.state as MockState;
    const result = fn(state); // throws => transaction rolls back, state untouched
    await tx
      .update(mockBushaState)
      .set({ state, updatedAt: new Date() })
      .where(eq(mockBushaState.profileId, profileId));
    return result;
  });
}

// ---------------------------------------------------------------------------
// Domain logic
// ---------------------------------------------------------------------------

function buildRate(source: Currency, target: Currency): BushaRate {
  const fx =
    (source === "cNGN" && target === "USDC") ||
    (source === "USDC" && target === "cNGN");
  return {
    product: fx ? "USDCcNGN" : `${source}${target}`,
    rate: fx ? USD_NGN_RATE.toFixed(2) : "1.00",
    side: source === "USDC" ? "sell" : "buy",
    type: "FIXED",
    source_currency: source,
    target_currency: target,
  };
}

/** Returns [sourceMinor, targetMinor] for the pair. */
function priceQuote(
  source: Currency,
  target: Currency,
  sourceMinor: number | null,
  targetMinor: number | null,
): [number, number] {
  if (source === "cNGN" && target === "USDC") {
    if (sourceMinor !== null) return [sourceMinor, ngnToUsdMinor(sourceMinor)];
    return [Math.ceil(targetMinor! * USD_NGN_RATE), targetMinor!];
  }
  if (source === "USDC" && target === "cNGN") {
    if (sourceMinor !== null) return [sourceMinor, usdToNgnMinor(sourceMinor)];
    return [Math.ceil(targetMinor! / USD_NGN_RATE), targetMinor!];
  }
  // 1:1 pegs: NGN -> cNGN (deposit), cNGN -> NGN (payout)
  const amt = sourceMinor ?? targetMinor!;
  return [amt, amt];
}

function materialize(t: StoredTransfer, now = Date.now()): BushaTransfer {
  const { progressiveStartMs, ...transfer } = t;
  if (progressiveStartMs === undefined) return transfer;
  const stage = Math.min(
    PAYOUT_STAGES.length - 1,
    Math.floor((now - progressiveStartMs) / PAYOUT_STAGE_MS),
  );
  const timeline: TimelineEvent[] = PAYOUT_STAGES.map((s, i) => ({
    status: s.status,
    label: s.label,
    done: i <= stage,
    timestamp: i <= stage ? iso(progressiveStartMs + i * PAYOUT_STAGE_MS) : null,
  }));
  return {
    ...transfer,
    status: PAYOUT_STAGES[stage].status,
    timeline,
    updated_at: timeline[stage].timestamp ?? transfer.updated_at,
  };
}

function balancesView(state: MockState): BushaBalance[] {
  return (Object.keys(CURRENCY_META) as Currency[]).map((currency) => {
    const slot = state.balances[currency];
    return {
      currency,
      name: CURRENCY_META[currency].name,
      total_balance: fromMinor(slot.available + slot.locked),
      available_balance: fromMinor(slot.available),
      pending_balance: fromMinor(slot.locked),
      is_fiat: CURRENCY_META[currency].is_fiat,
    };
  });
}

function debit(state: MockState, currency: Currency, minor: number) {
  const slot = state.balances[currency];
  if (slot.available < minor) {
    throw new MockError(
      422,
      "insufficient_balance",
      `Insufficient ${currency} balance: available ${fromMinor(slot.available)}, required ${fromMinor(minor)}`,
    );
  }
  slot.available -= minor;
}

function credit(state: MockState, currency: Currency, minor: number) {
  state.balances[currency].available += minor;
}

// ---------------------------------------------------------------------------
// Endpoint handlers
// ---------------------------------------------------------------------------

function deriveCustomerId(p: CreateIndividualCustomerPayload): string {
  const name = p.first_name.toLowerCase().replace(/[^a-z]/g, "") || "user";
  const digits = p.phone_number.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `BUS_${name}${digits}`;
}

async function createCustomer(body: unknown) {
  const p = asObject(body) as unknown as CreateIndividualCustomerPayload;
  for (const f of ["email", "first_name", "last_name", "phone_number"] as const) {
    if (!p[f]) throw invalid(`${f} is required`);
  }
  if (p.type !== "individual") throw invalid("type must be 'individual'");
  if (p.has_accepted_terms !== true) {
    throw invalid("has_accepted_terms must be true");
  }
  const customerId = deriveCustomerId(p);
  const customer = await mutateState(
    customerId,
    (s) => {
      if (!s.customer) {
        s.customer = {
          id: customerId,
          type: "individual",
          status: "verified",
          email: p.email,
          first_name: p.first_name,
          last_name: p.last_name,
          phone_number: p.phone_number,
          country: p.country ?? "NG",
          created_at: iso(),
        };
      }
      return s.customer;
    },
    { create: true },
  );
  return { status: 201, data: customer };
}

const BASE64_IMAGE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/;

async function verifyCustomer(customerId: string, body: unknown) {
  const p = asObject(body) as unknown as VerifyCustomerPayload;
  if (p.document_type !== "nin") throw invalid("document_type must be 'nin'");
  const fail = (msg: string) => new MockError(422, "verification_failed", msg);
  if (!/^\d{11}$/.test(p.document_number ?? "")) {
    throw fail("NIN must be exactly 11 digits");
  }
  if (!BASE64_IMAGE.test(p.selfie_image ?? "") || p.selfie_image.length < 100) {
    throw fail("Liveness check failed: selfie_image must be a base64 image data URL");
  }
  const verification = await mutateState(customerId, (s) => {
    if (!s.customer) throw notFound(`Customer ${customerId}`);
    const v: BushaVerification = {
      id: genId("VRF"),
      customer_id: customerId,
      status: "verified",
      document_type: "nin",
      liveness: { passed: true, score: 0.97 },
      verified_at: iso(),
    };
    s.customer.status = "verified";
    s.verifications.push(v);
    return v;
  });
  return { status: 200, data: verification };
}

async function createQuote(profileId: string, body: unknown) {
  const p = asObject(body) as unknown as CreateQuotePayload;
  const { source_currency: src, target_currency: tgt, pay_in, pay_out } = p;
  if (!src || !tgt || !pay_in || !pay_out) {
    throw invalid("source_currency, target_currency, pay_in and pay_out are required");
  }
  if ((p.source_amount == null) === (p.target_amount == null)) {
    throw invalid("Provide exactly one of source_amount or target_amount");
  }

  const isDeposit =
    src === "NGN" && tgt === "cNGN" &&
    pay_in.type === "temporary_bank_account" && pay_out.type === "balance";
  const isConversion =
    ((src === "cNGN" && tgt === "USDC") || (src === "USDC" && tgt === "cNGN")) &&
    pay_in.type === "balance" && pay_out.type === "balance";
  const isPayout =
    src === "cNGN" && tgt === "NGN" &&
    pay_in.type === "balance" && pay_out.type === "bank_transfer";
  if (!isDeposit && !isConversion && !isPayout) {
    throw invalid(`Unsupported quote route ${src} (${pay_in.type}) -> ${tgt} (${pay_out.type})`);
  }

  const srcMinor = p.source_amount != null ? parseAmount(p.source_amount, "source_amount") : null;
  const tgtMinor = p.target_amount != null ? parseAmount(p.target_amount, "target_amount") : null;
  const [sourceMinor, targetMinor] = priceQuote(src, tgt, srcMinor, tgtMinor);
  if (targetMinor < 1) throw invalid("Amount too small to convert");
  if (isDeposit && sourceMinor < 100_00) throw invalid("Minimum deposit is NGN 100");

  const quote = await mutateState(profileId, (s) => {
    if (isPayout) {
      const rid = (pay_out as { recipient_id?: string }).recipient_id;
      if (!rid || !s.recipients[rid]) throw notFound(`Recipient ${rid}`);
    }
    const now = Date.now();
    const q: BushaQuote = {
      id: genId("QUO"),
      profile_id: profileId,
      source_currency: src,
      target_currency: tgt,
      source_amount: fromMinor(sourceMinor),
      target_amount: fromMinor(targetMinor),
      rate: buildRate(src, tgt),
      fees: [],
      pay_in,
      pay_out,
      status: "pending",
      reference: p.reference,
      expires_at: iso(now + QUOTE_TTL_MS),
      created_at: iso(now),
    };
    s.quotes[q.id] = q;
    return q;
  });
  return { status: 201, data: quote };
}

async function createTransfer(profileId: string, body: unknown) {
  const p = asObject(body) as unknown as CreateTransferPayload;
  if (!p.quote_id) throw invalid("quote_id is required");

  const transfer = await mutateState(profileId, (s) => {
    const q = s.quotes[p.quote_id];
    if (!q) throw notFound(`Quote ${p.quote_id}`);
    if (q.status === "used") throw invalid("Quote has already been used");
    if (Date.parse(q.expires_at) < Date.now()) {
      q.status = "expired";
      throw new MockError(409, "quote_expired", "Quote has expired, request a new one");
    }

    const now = Date.now();
    const sourceMinor = toMinor(q.source_amount);
    const targetMinor = toMinor(q.target_amount);
    const base = {
      id: genId("TRF"),
      profile_id: profileId,
      quote_id: q.id,
      reference: p.reference ?? q.reference ?? genId("REF"),
      source_currency: q.source_currency,
      target_currency: q.target_currency,
      source_amount: q.source_amount,
      target_amount: q.target_amount,
      rate: q.rate,
      pay_out: q.pay_out,
      created_at: iso(now),
      updated_at: iso(now),
    };

    let t: StoredTransfer;
    if (q.pay_in.type === "temporary_bank_account") {
      const c = s.customer;
      const accountName = c
        ? `BUSHA / ${c.first_name} ${c.last_name}`.toUpperCase()
        : "BUSHA / CUSTOMER";
      t = {
        ...base,
        type: "deposit",
        status: "pending",
        pay_in: {
          type: "temporary_bank_account",
          bank_name: "Providus Bank (Busha)",
          account_number: "9981234567",
          account_name: accountName,
          expires_at: iso(now + TEMP_ACCOUNT_TTL_MS),
        },
        timeline: [
          { status: "pending", label: "Awaiting bank transfer", done: true, timestamp: iso(now) },
          { status: "funds_received", label: "Funds received", done: false, timestamp: null },
        ],
      };
    } else if (q.pay_out.type === "balance") {
      // Balance <-> balance conversion: settle instantly.
      debit(s, q.source_currency, sourceMinor);
      credit(s, q.target_currency, targetMinor);
      t = {
        ...base,
        type: "conversion",
        status: "funds_converted",
        pay_in: { type: "balance" },
        timeline: [
          { status: "pending", label: "Conversion requested", done: true, timestamp: iso(now) },
          { status: "processing", label: "Converting at fixed rate", done: true, timestamp: iso(now) },
          { status: "funds_converted", label: "Funds converted", done: true, timestamp: iso(now) },
        ],
      };
    } else {
      // Payout to bank: debit now, settle progressively through the timeline.
      debit(s, q.source_currency, sourceMinor);
      s.ledger.push({ at: iso(now), direction: "out", ngnMinor: targetMinor, kind: "payout" });
      t = {
        ...base,
        type: "payout",
        status: "pending",
        pay_in: { type: "balance" },
        timeline: [],
        progressiveStartMs: now,
      };
    }

    q.status = "used";
    s.transfers[t.id] = t;
    return materialize(t, now);
  });
  return { status: 201, data: transfer };
}

async function getTransfer(profileId: string, transferId: string) {
  const s = await readState(profileId);
  const t = s.transfers[transferId];
  if (!t) throw notFound(`Transfer ${transferId}`);
  return { status: 200, data: materialize(t) };
}

async function listTransfers(profileId: string) {
  const s = await readState(profileId);
  const data = Object.values(s.transfers)
    .map((t) => materialize(t))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { status: 200, data };
}

async function createRecipient(profileId: string, body: unknown) {
  const p = asObject(body) as unknown as CreateRecipientPayload;
  if (p.type !== "nigerian_bank_account") throw invalid("type must be 'nigerian_bank_account'");
  const d = p.details;
  if (!d?.bank_code || !d.bank_name || !d.account_name) {
    throw invalid("details.bank_code, bank_name and account_name are required");
  }
  if (!/^\d{10}$/.test(d.account_number ?? "")) {
    throw invalid("details.account_number must be a 10-digit NUBAN");
  }
  const recipient = await mutateState(profileId, (s) => {
    const existing = Object.values(s.recipients).find(
      (r) => r.details.bank_code === d.bank_code && r.details.account_number === d.account_number,
    );
    if (existing) return existing;
    const r: BushaRecipient = {
      id: genId("RCP"),
      profile_id: profileId,
      type: "nigerian_bank_account",
      currency: "NGN",
      country: "NG",
      name: p.name,
      details: { ...d },
      created_at: iso(),
    };
    s.recipients[r.id] = r;
    return r;
  });
  return { status: 201, data: recipient };
}

function bucketKey(date: Date, interval: "daily" | "weekly" | "monthly"): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (interval === "monthly") d.setUTCDate(1);
  if (interval === "weekly") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  return d.toISOString().slice(0, 10);
}

function nextBucket(key: string, interval: "daily" | "weekly" | "monthly"): string {
  const d = new Date(`${key}T00:00:00Z`);
  if (interval === "daily") d.setUTCDate(d.getUTCDate() + 1);
  if (interval === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  if (interval === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function getTrends(profileId: string, query: Record<string, string>) {
  const interval = (["daily", "weekly", "monthly"] as const).find((i) => i === query.interval) ?? "monthly";
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 90 * 86_400_000);
  if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime()) || from > to) {
    throw invalid("Invalid from/to range");
  }
  const s = await readState(profileId);

  const buckets = new Map<string, { inflow: number; outflow: number }>();
  const endKey = bucketKey(to, interval);
  for (let k = bucketKey(from, interval); k <= endKey; k = nextBucket(k, interval)) {
    buckets.set(k, { inflow: 0, outflow: 0 });
  }
  let totalIn = 0;
  let totalOut = 0;
  for (const e of s.ledger) {
    const at = new Date(e.at);
    if (at < from || at > to) continue;
    const b = buckets.get(bucketKey(at, interval));
    if (!b) continue;
    if (e.direction === "in") { b.inflow += e.ngnMinor; totalIn += e.ngnMinor; }
    else { b.outflow += e.ngnMinor; totalOut += e.ngnMinor; }
  }
  const series: TrendsPoint[] = [...buckets.entries()].map(([date, b]) => ({
    date,
    inflow: fromMinor(b.inflow),
    outflow: fromMinor(b.outflow),
    net: fromMinor(b.inflow - b.outflow),
  }));
  const data: BushaTrends = {
    currency: "NGN",
    interval,
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      total_inflow: fromMinor(totalIn),
      total_outflow: fromMinor(totalOut),
      net_cash_flow: fromMinor(totalIn - totalOut),
    },
    series,
  };
  return { status: 200, data };
}

async function createPledgeQuote(profileId: string, body: unknown) {
  const p = asObject(body) as unknown as CreatePledgeQuotePayload;
  if (p.collateral_currency !== "USDC" || p.loan_currency !== "cNGN") {
    throw invalid("Only USDC collateral against cNGN loans is supported");
  }
  const collateralMinor = parseAmount(p.collateral_amount, "collateral_amount");
  const loanMinor = parseAmount(p.loan_amount, "loan_amount");
  const collateralValueNgnMinor = usdToNgnMinor(collateralMinor);
  const ltv = loanMinor / collateralValueNgnMinor;
  if (ltv > PLEDGE_MAX_LTV) {
    throw invalid(`LTV ${(ltv * 100).toFixed(1)}% exceeds maximum ${(PLEDGE_MAX_LTV * 100).toFixed(0)}%`);
  }
  const quote = await mutateState(profileId, (s) => {
    const q: BushaPledgeQuote = {
      id: genId("PQT"),
      collateral_currency: "USDC",
      collateral_amount: fromMinor(collateralMinor),
      loan_currency: "cNGN",
      loan_amount: fromMinor(loanMinor),
      ltv: ltv.toFixed(4),
      max_ltv: PLEDGE_MAX_LTV.toFixed(4),
      expires_at: iso(Date.now() + PLEDGE_QUOTE_TTL_MS),
    };
    s.pledgeQuotes[q.id] = q;
    return q;
  });
  return { status: 201, data: quote };
}

async function createPledge(profileId: string, body: unknown) {
  const { quote_id } = asObject(body) as { quote_id?: string };
  if (!quote_id) throw invalid("quote_id is required");
  const pledge = await mutateState(profileId, (s) => {
    const q = s.pledgeQuotes[quote_id];
    if (!q) throw notFound(`Pledge quote ${quote_id}`);
    if (Date.parse(q.expires_at) < Date.now()) {
      throw new MockError(409, "quote_expired", "Pledge quote has expired");
    }
    const pl: BushaPledge = {
      id: genId("PLG"),
      profile_id: profileId,
      quote_id,
      status: "pending",
      collateral_currency: "USDC",
      collateral_amount: q.collateral_amount,
      loan_currency: "cNGN",
      loan_amount: q.loan_amount,
      ltv: q.ltv,
      created_at: iso(),
      activated_at: null,
    };
    s.pledges[pl.id] = pl;
    delete s.pledgeQuotes[quote_id];
    return pl;
  });
  return { status: 201, data: pledge };
}

async function activatePledge(profileId: string, pledgeId: string) {
  const pledge = await mutateState(profileId, (s) => {
    const pl = s.pledges[pledgeId];
    if (!pl) throw notFound(`Pledge ${pledgeId}`);
    if (pl.status !== "pending") throw invalid(`Pledge is already ${pl.status}`);
    const collateral = toMinor(pl.collateral_amount);
    debit(s, "USDC", collateral); // throws insufficient_balance if not enough
    s.balances.USDC.locked += collateral;
    credit(s, "cNGN", toMinor(pl.loan_amount));
    pl.status = "authorized";
    pl.activated_at = iso();
    return pl;
  });
  return { status: 200, data: pledge };
}

async function getPledge(profileId: string, pledgeId: string) {
  const s = await readState(profileId);
  const pl = s.pledges[pledgeId];
  if (!pl) throw notFound(`Pledge ${pledgeId}`);
  return { status: 200, data: pl };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export interface MockRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  profileId?: string;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

export async function handleMockRequest(req: MockRequest): Promise<MockResponse> {
  const { method, path } = req;
  const route = `${method.toUpperCase()} ${path.split("?")[0]}`;
  const needProfile = () => {
    if (!req.profileId) throw new MockError(401, "unauthorized", "X-BU-PROFILE-ID header is required");
    return req.profileId;
  };

  try {
    let m: RegExpMatchArray | null;
    let result: { status: number; data: unknown };

    if (route === "POST /v1/customers") result = await createCustomer(req.body);
    else if ((m = route.match(/^POST \/v1\/customers\/([^/]+)\/verify$/))) result = await verifyCustomer(m[1], req.body);
    else if (route === "GET /v1/balances") result = { status: 200, data: balancesView(await readState(needProfile())) };
    else if (route === "POST /v1/quotes") result = await createQuote(needProfile(), req.body);
    else if (route === "POST /v1/transfers") result = await createTransfer(needProfile(), req.body);
    else if (route === "GET /v1/transfers") result = await listTransfers(needProfile());
    else if ((m = route.match(/^GET \/v1\/transfers\/([^/]+)$/))) result = await getTransfer(needProfile(), m[1]);
    else if (route === "POST /v1/recipients") result = await createRecipient(needProfile(), req.body);
    else if (route === "GET /v1/recipients") result = { status: 200, data: Object.values((await readState(needProfile())).recipients) };
    else if (route === "GET /v1/insights/transactions/trends") result = await getTrends(needProfile(), req.query ?? {});
    else if (route === "POST /v1/pledges/quotes") result = await createPledgeQuote(needProfile(), req.body);
    else if (route === "POST /v1/pledges") result = await createPledge(needProfile(), req.body);
    else if ((m = route.match(/^POST \/v1\/pledges\/([^/]+)\/activate$/))) result = await activatePledge(needProfile(), m[1]);
    else if ((m = route.match(/^GET \/v1\/pledges\/([^/]+)$/))) result = await getPledge(needProfile(), m[1]);
    else throw new MockError(404, "not_found", `No mock route for ${route}`);

    return { status: result.status, body: { status: "success", data: result.data } };
  } catch (err) {
    if (err instanceof MockError) {
      return {
        status: err.status,
        body: { status: "error", error: { name: err.errorName, message: err.message } },
      };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Sandbox-only hooks (things that happen *outside* Busha's API in real life)
// ---------------------------------------------------------------------------

/**
 * Simulates the employer's bank / POS agent paying into the temporary virtual
 * account (an NIP transfer). Credits cNGN and marks the deposit transfer
 * `funds_received` — exactly the state Busha would be in before it fires the
 * `transfer.funds_received` webhook.
 */
export async function simulateInboundBankTransfer(
  profileId: string,
  transferId: string,
  amountNgn: number,
): Promise<BushaTransfer> {
  const minor = toMinor(amountNgn);
  try {
    return await mutateState(profileId, (s) => {
      const t = s.transfers[transferId];
      if (!t || t.type !== "deposit") throw notFound(`Deposit transfer ${transferId}`);
      if (t.status !== "pending") throw invalid(`Deposit transfer is already ${t.status}`);
      const now = Date.now();
      credit(s, "cNGN", minor);
      s.ledger.push({ at: iso(now), direction: "in", ngnMinor: minor, kind: "deposit" });
      t.status = "funds_received";
      t.source_amount = fromMinor(minor);
      t.target_amount = fromMinor(minor);
      t.updated_at = iso(now);
      t.timeline = t.timeline.map((e) =>
        e.status === "funds_received" ? { ...e, done: true, timestamp: iso(now) } : e,
      );
      return materialize(t, now);
    });
  } catch (err) {
    if (err instanceof MockError) throw new Error(err.message);
    throw err;
  }
}

/**
 * Seeds three months of realistic salary / spending history into the insights
 * ledger only (balances are untouched) so the Financial Passport has data.
 */
export async function seedMockInsightsHistory(profileId: string): Promise<number> {
  return mutateState(profileId, (s) => {
    if (s.ledger.some((e) => e.kind.startsWith("seed_"))) return 0;
    const now = new Date();
    const entries: LedgerEntry[] = [];
    const push = (monthsAgo: number, day: number, direction: "in" | "out", ngn: number, kind: string) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day, 9, 30));
      if (d < now) entries.push({ at: d.toISOString(), direction, ngnMinor: toMinor(ngn), kind });
    };
    for (let m = 3; m >= 1; m--) {
      push(m, 25, "in", 150_000, "seed_salary");
      push(m, 12, "in", 15_000, "seed_pos_cash_in");
      push(m, 27, "out", 20_000, "seed_remit_mama");
      for (const day of [3, 10, 17, 24]) push(m, day, "out", 14_500 + m * 250, "seed_transport_food");
      push(m, 5, "out", 6_000, "seed_data_airtime");
    }
    s.ledger.push(...entries);
    return entries.length;
  });
}

export async function deleteMockProfile(profileId: string): Promise<void> {
  await getDb().delete(mockBushaState).where(eq(mockBushaState.profileId, profileId));
}
