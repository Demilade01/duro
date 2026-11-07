/**
 * Typed client + shared response types for the Duro frontend.
 *
 * Usage:
 *   const client = createDuroClient(); // stores deviceId & mode in localStorage
 *   const wallet = await client.getWallet();
 *   const res = await client.simulateSalary(150_000);
 */
import type { ApiLog, Transaction } from "@/lib/db/schema";
import type {
  BushaCustomer,
  BushaMode,
  BushaPledge,
  BushaQuote,
  BushaTransfer,
  BushaVerification,
} from "@/lib/busha/types";
import type { DuroErrorCode } from "@/lib/errors";
import type { ApiResponse } from "@/lib/http";
import type { LockState } from "@/lib/security/velocity-guard";
import type { ConversionDirection } from "@/lib/services/conversions";
import type { AutoSaveResult } from "@/lib/services/deposits";
import type { FundingSource, VirtualAccount } from "@/lib/services/funding";
import type { publicProfile, publicRecipient, summarizeBalances } from "@/lib/services/wallet";

export type PublicProfile = ReturnType<typeof publicProfile>;
export type PublicRecipient = ReturnType<typeof publicRecipient>;
export type WalletBalances = ReturnType<typeof summarizeBalances>;

export type {
  ApiLog,
  ApiResponse,
  AutoSaveResult,
  BushaCustomer,
  BushaMode,
  BushaPledge,
  BushaQuote,
  BushaTransfer,
  BushaVerification,
  ConversionDirection,
  DuroErrorCode,
  FundingSource,
  LockState,
  Transaction,
  VirtualAccount,
};

// ---------------------------------------------------------------------------
// Route response payloads (`data` inside `{ ok: true, data }`)
// ---------------------------------------------------------------------------

export interface OnboardingResponse {
  created: boolean;
  profile: PublicProfile;
  recipients: PublicRecipient[];
  bushaCustomer?: BushaCustomer;
  verification?: BushaVerification;
  seededInsightsEntries?: number;
}

export interface WalletSnapshot {
  profile: PublicProfile;
  mode: BushaMode;
  device: { id: string | null; trusted: boolean };
  lock: LockState;
  rate: { usdNgn: number };
  balances: WalletBalances | null;
  balancesError: string | null;
  recipients: PublicRecipient[];
  transactions: Transaction[];
  logs: ApiLog[];
}

export interface FundResponse {
  quote: BushaQuote;
  transferId: string;
  transfer: BushaTransfer;
  virtualAccount: VirtualAccount;
  transaction: Transaction;
}

export interface SimulateSalaryResponse {
  virtualAccount: VirtualAccount;
  transferId: string;
  reusedVirtualAccount: boolean;
  webhook: {
    signature: string;
    received: true;
    duplicate: boolean;
    eventId: string;
  };
  credited: number;
  autoSaved: AutoSaveResult | null;
}

export type SplitResponse =
  | { profile: PublicProfile }
  | { transfer: BushaTransfer; transaction: Transaction; balances: WalletBalances };

export interface RemitQuoteResponse {
  quote: BushaQuote;
  recipient: PublicRecipient;
  feeBreakdown: {
    principalNgn: number;
    feeNgn: number;
    baseFeeNgn: number;
    vatNgn: number;
    totalDebitNgn: number;
  };
}

export interface RemitResponse {
  transfer: BushaTransfer;
  transaction: Transaction;
  recipient: PublicRecipient;
  quote?: BushaQuote;
  feeBreakdown?: {
    principalNgn: number;
    feeNgn: number;
    baseFeeNgn: number;
    vatNgn: number;
    totalDebitNgn: number;
  };
}

export interface RemitPollResponse {
  transfer: BushaTransfer;
  transaction: Transaction | null;
}

export interface PassportStatementResponse {
  statement: {
    statementId: string;
    title: string;
    holder: PublicProfile;
    kyc: { status: string; method: string; provider: string };
    consent: { granted: true; grantedAt: string; scope: string };
    period: { from: string; to: string; interval: "daily" | "weekly" | "monthly" };
    currency: "NGN";
    summary: { totalInflow: number; totalOutflow: number; netCashFlow: number };
    series: { date: string; inflow: number; outflow: number; net: number }[];
    savings: { usdc: number; ngnEquivalent: number };
    generatedAt: string;
  };
  creditOffer: {
    eligible: boolean;
    maxAdvanceNgn: number;
    avgMonthlyInflow: number;
    collateralRatio: number;
    usdcAvailable: number;
    rate: number;
    limitedBy: "INCOME" | "COLLATERAL";
  };
}

export interface PledgeAdvanceResponse {
  pledge: BushaPledge;
  collateralUsdc: number;
  advanceNgn: number;
  ltv: number;
  transaction: Transaction;
  balances: WalletBalances;
}

export interface SimSwapResponse {
  deviceId: string;
  lock: LockState;
  verification?: BushaVerification;
  profile?: PublicProfile;
}

export interface RecipientsListResponse {
  recipients: PublicRecipient[];
}

export interface RecipientMutationResponse {
  recipient: PublicRecipient;
  created: boolean;
}

export interface DeleteRecipientResponse {
  deleted: boolean;
  id: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class DuroClientError extends Error {
  constructor(
    public readonly code: DuroErrorCode | string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DuroClientError";
  }
}

const LS_DEVICE = "duro.deviceId";
const LS_MODE = "duro.bushaMode";

export function createDuroClient(init?: { deviceId?: string; mode?: BushaMode; baseUrl?: string }) {
  let deviceId =
    init?.deviceId ??
    (typeof window !== "undefined" ? window.localStorage.getItem(LS_DEVICE) : null) ??
    "DEV_TUNDE_IPHONE_01";
  let mode: BushaMode | null =
    init?.mode ??
    ((typeof window !== "undefined" ? window.localStorage.getItem(LS_MODE) : null) as BushaMode | null) ??
    ((process.env.NEXT_PUBLIC_BUSHA_API_MODE as BushaMode | undefined) ?? null);
  const baseUrl = init?.baseUrl ?? "";

  const setDeviceId = (next: string) => {
    deviceId = next;
    if (typeof window !== "undefined") window.localStorage.setItem(LS_DEVICE, next);
  };
  const setMode = (next: BushaMode) => {
    mode = next;
    if (typeof window !== "undefined") window.localStorage.setItem(LS_MODE, next);
  };

  async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    };
    if (mode) headers["x-busha-mode"] = mode;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.ok) {
      throw new DuroClientError(json.error.code, json.error.message, res.status, json.error.details);
    }
    return json.data;
  }

  return {
    get deviceId() { return deviceId; },
    get mode() { return mode; },
    setDeviceId,
    setMode,

    getRecipients: () => request<RecipientsListResponse>("GET", "/api/recipients"),

    addRecipient: (body: {
      label: string;
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
    }) => request<RecipientMutationResponse>("POST", "/api/recipients", body),

    deleteRecipient: (id: string) =>
      request<DeleteRecipientResponse>("DELETE", "/api/recipients", { id }),

    onboard: (body: {
      phone?: string;
      email?: string;
      fullName?: string;
      nin?: string;
      selfieImage?: string;
      reset?: boolean;
    } = {}) => request<OnboardingResponse>("POST", "/api/onboarding", body),

    getWallet: () => request<WalletSnapshot>("GET", "/api/wallet"),

    fund: (body: { amountNgn?: number; source?: FundingSource } = {}) =>
      request<FundResponse>("POST", "/api/fund", body),

    simulateSalary: (amountNgn = 150_000, source: FundingSource = "EMPLOYER") =>
      request<SimulateSalaryResponse>("POST", "/api/simulate/salary", { amountNgn, source }),

    setAutoSavePercent: (percent: number) =>
      request<{ profile: PublicProfile }>("POST", "/api/split", { action: "SET_PERCENT", percent }),

    moveBetweenBalances: (direction: ConversionDirection, amount: number) =>
      request<{ transfer: BushaTransfer; transaction: Transaction; balances: WalletBalances }>(
        "POST",
        "/api/split",
        { action: "MOVE", direction, amount },
      ),

    quoteRemit: (
      body:
        | { recipientId: string; amountNgn: number; narration?: string }
        | {
            newRecipient: {
              label: string;
              bankName: string;
              bankCode: string;
              accountNumber: string;
              accountName: string;
            };
            amountNgn: number;
            narration?: string;
          },
    ) => request<RemitQuoteResponse>("POST", "/api/remit", { ...body, action: "QUOTE" }),

    remit: (
      body:
        | { recipientId: string; amountNgn: number; narration?: string; quoteId?: string }
        | {
            newRecipient: {
              label: string;
              bankName: string;
              bankCode: string;
              accountNumber: string;
              accountName: string;
            };
            amountNgn: number;
            narration?: string;
            quoteId?: string;
          },
    ) => request<RemitResponse>("POST", "/api/remit", { ...body, action: "SEND" }),

    pollRemit: (transferId: string) =>
      request<RemitPollResponse>("GET", `/api/remit?transferId=${encodeURIComponent(transferId)}`),

    getStatement: (opts: { from?: string; to?: string; interval?: "daily" | "weekly" | "monthly" } = {}) => {
      const qs = new URLSearchParams({ consent: "true", ...(opts.from ? { from: opts.from } : {}), ...(opts.to ? { to: opts.to } : {}), ...(opts.interval ? { interval: opts.interval } : {}) });
      return request<PassportStatementResponse>("GET", `/api/passport?${qs.toString()}`);
    },

    requestAdvance: (advanceNgn: number, purpose: "RENT" | "SCHOOL_FEES" | "EMERGENCY" = "RENT") =>
      request<PledgeAdvanceResponse>("POST", "/api/passport", { advanceNgn, purpose }),

    simulateSimSwapAttack: async () => {
      const data = await request<SimSwapResponse>("POST", "/api/security/sim-swap", { action: "SIMULATE_ATTACK" });
      setDeviceId(data.deviceId);
      return data;
    },

    recoverIdentity: (nin: string, selfieImage: string) =>
      request<SimSwapResponse>("POST", "/api/security/sim-swap", {
        action: "RECOVER_IDENTITY",
        nin,
        selfieImage,
      }),
  };
}
