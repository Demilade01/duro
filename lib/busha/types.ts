/**
 * Busha API wire types (snake_case, amounts as decimal strings — exactly as Busha returns them).
 */

export type BushaMode = "MOCK" | "LIVE";
export type Currency = "cNGN" | "USDC" | "NGN";

export interface BushaSuccess<T> {
  status: "success";
  message?: string;
  data: T;
}

export interface BushaErrorBody {
  status: "error";
  error: { name: string; message: string; details?: unknown };
}

// ---------- Customers ----------

export interface CreateIndividualCustomerPayload {
  type: "individual";
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: "NG";
  has_accepted_terms: true;
}

export interface BushaCustomer {
  id: string;
  type: "individual";
  status: "pending" | "verified" | "rejected";
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: string;
  created_at: string;
}

export interface VerifyCustomerPayload {
  country: "NG";
  document_type: "nin";
  document_number: string;
  document_image: string;
  selfie_image: string;
}

export interface BushaVerification {
  id: string;
  customer_id: string;
  status: "verified" | "rejected";
  document_type: "nin";
  liveness: { passed: boolean; score: number };
  verified_at: string;
}

// ---------- Balances ----------

export interface BushaBalance {
  currency: Currency;
  name: string;
  total_balance: string;
  available_balance: string;
  pending_balance: string;
  is_fiat: boolean;
}

// ---------- Quotes ----------

export type PayIn =
  | { type: "temporary_bank_account"; channel: "bank_transfer" }
  | { type: "balance" };

export type PayOut =
  | { type: "balance" }
  | { type: "bank_transfer"; recipient_id: string };

export interface CreateQuotePayload {
  source_currency: Currency;
  target_currency: Currency;
  source_amount?: string;
  target_amount?: string;
  pay_in: PayIn;
  pay_out: PayOut;
  reference?: string;
}

export interface BushaRate {
  product: string;
  rate: string;
  side: "buy" | "sell";
  type: "FIXED";
  source_currency: Currency;
  target_currency: Currency;
}

export interface BushaQuote {
  id: string;
  profile_id: string;
  source_currency: Currency;
  target_currency: Currency;
  source_amount: string;
  target_amount: string;
  rate: BushaRate;
  fees: { name: string; amount: { amount: string; currency: Currency } }[];
  pay_in: PayIn;
  pay_out: PayOut;
  status: "pending" | "used" | "expired";
  reference?: string;
  expires_at: string;
  created_at: string;
}

// ---------- Transfers ----------

export type TransferStatus =
  | "pending"
  | "processing"
  | "outgoing_payment_sent"
  | "funds_delivered"
  | "funds_received"
  | "funds_converted"
  | "failed"
  | "cancelled";

export interface TimelineEvent {
  status: TransferStatus;
  label: string;
  done: boolean;
  timestamp: string | null;
}

export interface TemporaryBankAccountPayIn {
  type: "temporary_bank_account";
  bank_name: string;
  account_number: string;
  account_name: string;
  expires_at: string;
}

export interface CreateTransferPayload {
  quote_id: string;
  reference?: string;
}

export interface BushaTransfer {
  id: string;
  profile_id: string;
  quote_id: string;
  reference: string;
  type: "deposit" | "conversion" | "payout";
  status: TransferStatus;
  source_currency: Currency;
  target_currency: Currency;
  source_amount: string;
  target_amount: string;
  rate: BushaRate;
  pay_in: TemporaryBankAccountPayIn | { type: "balance" };
  pay_out: PayOut;
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

// ---------- Recipients ----------

export interface CreateRecipientPayload {
  type: "nigerian_bank_account";
  currency: "NGN";
  country: "NG";
  name: string;
  details: {
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
  };
}

export interface BushaRecipient extends CreateRecipientPayload {
  id: string;
  profile_id: string;
  created_at: string;
}

// ---------- Insights ----------

export interface TrendsQuery {
  currency?: "NGN";
  from?: string;
  to?: string;
  interval?: "daily" | "weekly" | "monthly";
}

export interface TrendsPoint {
  date: string;
  inflow: string;
  outflow: string;
  net: string;
}

export interface BushaTrends {
  currency: "NGN";
  interval: "daily" | "weekly" | "monthly";
  from: string;
  to: string;
  summary: { total_inflow: string; total_outflow: string; net_cash_flow: string };
  series: TrendsPoint[];
}

// ---------- Pledges ----------

export interface CreatePledgeQuotePayload {
  collateral_currency: "USDC";
  collateral_amount: string;
  loan_currency: "cNGN";
  loan_amount: string;
}

export interface BushaPledgeQuote {
  id: string;
  collateral_currency: "USDC";
  collateral_amount: string;
  loan_currency: "cNGN";
  loan_amount: string;
  ltv: string;
  max_ltv: string;
  expires_at: string;
}

export interface BushaPledge {
  id: string;
  profile_id: string;
  quote_id: string;
  status: "pending" | "authorized" | "released" | "liquidated";
  collateral_currency: "USDC";
  collateral_amount: string;
  loan_currency: "cNGN";
  loan_amount: string;
  ltv: string;
  created_at: string;
  activated_at: string | null;
}

// ---------- Webhooks ----------

export interface BushaWebhookEvent<T = BushaTransfer> {
  id: string;
  event:
    | "transfer.funds_received"
    | "transfer.funds_converted"
    | "transfer.funds_delivered"
    | "transfer.status_updated";
  created_at: string;
  data: T;
}
