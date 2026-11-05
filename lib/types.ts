export type BushaApiMode = "MOCK" | "LIVE";

export type WalletTab = "home" | "fund" | "send" | "passport";

export interface TrustedRecipient {
  id: string;
  userId: string;
  bushaRecipientId: string;
  label: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPreVerified: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  nin: string;
  bushaProfileId: string;
  kycStatus: "VERIFIED" | "PENDING" | "UNVERIFIED";
  autoSavePercent: number;
  trustedDeviceId: string;
  simSwapLockedUntil: string | null;
  createdAt: string;
  recipients: TrustedRecipient[];
}

export interface BushaBalance {
  currency: "cNGN" | "USDC" | "NGN";
  name: string;
  total_balance: number;
  available_balance: number;
  pending_balance: number;
  locked_balance?: number;
  is_fiat: boolean;
}

export type TransferStageStatus =
  | "pending"
  | "processing"
  | "outgoing_payment_sent"
  | "funds_delivered"
  | "funds_converted";

export interface TransferTimelineStep {
  step: TransferStageStatus;
  label: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

export interface VirtualAccountPayIn {
  type: "temporary_bank_account";
  bank_name: string;
  account_number: string;
  account_name: string;
  expires_at: string;
  expected_amount_ngn: number;
  quote_id: string;
  transfer_id: string;
}

export interface WalletTransaction {
  id: string;
  bushaTransferId: string;
  quoteId: string;
  type:
    | "SALARY_INFLOW"
    | "AUTO_SAVE_SPLIT"
    | "MANUAL_SWAP"
    | "FAMILY_REMIT"
    | "RENT_ADVANCE_PLEDGE";
  title: string;
  subtitle: string;
  sourceCurrency: "NGN" | "cNGN" | "USDC";
  targetCurrency: "NGN" | "cNGN" | "USDC";
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  status: TransferStageStatus;
  recipientName?: string;
  recipientBank?: string;
  recipientAccount?: string;
  isPreVerifiedRecipient?: boolean;
  createdAt: string;
  timeline?: TransferTimelineStep[];
}

export interface BushaInsightSeriesPoint {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface BushaInsightSummary {
  currency: "NGN";
  summary: {
    total_inflow: number;
    total_outflow: number;
    net_cash_flow: number;
    savings_retention_rate: number;
    verified_employer: string;
  };
  series: BushaInsightSeriesPoint[];
}

export interface ActivePledge {
  id: string;
  quoteId: string;
  collateralUsdc: number;
  advanceNgn: number;
  ltvPercent: number;
  aprPercent: number;
  status: "authorized" | "repaid";
  createdAt: string;
  dueDate: string;
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  direction: "OUTGOING_API" | "INCOMING_WEBHOOK" | "SECURITY_GUARD";
  method: "GET" | "POST" | "GUARD";
  endpoint: string;
  status: number;
  durationMs: number;
  mode: BushaApiMode;
  headers: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface WalletStateResponse {
  user: UserProfile;
  balances: {
    cNGN: BushaBalance;
    USDC: BushaBalance;
    fxRateNgnPerUsd: number;
  };
  virtualAccount: VirtualAccountPayIn | null;
  transactions: WalletTransaction[];
  insights: BushaInsightSummary;
  pledges: ActivePledge[];
  telemetry: TelemetryLogEntry[];
  security: {
    isSimSwapLocked: boolean;
    lockedUntil: string | null;
    activeDeviceId: string;
    trustedDeviceId: string;
    lockReason: string | null;
  };
  backendConnected: boolean;
}
