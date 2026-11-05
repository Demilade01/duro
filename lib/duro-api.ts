import {
  ActivePledge,
  BushaApiMode,
  BushaInsightSummary,
  TelemetryLogEntry,
  TransferStageStatus,
  TransferTimelineStep,
  TrustedRecipient,
  UserProfile,
  VirtualAccountPayIn,
  WalletStateResponse,
  WalletTransaction,
} from "./types";
import type {
  FundResponse,
  PassportStatementResponse,
  PledgeAdvanceResponse,
  RemitResponse,
  SimSwapResponse,
  WalletSnapshot,
} from "./api-types";
import { MAMA, TUNDE } from "./demo";

const STORAGE_KEY = "duro_busha_sandbox_state_v1";
export const FX_RATE_NGN_PER_USD = 1593;

export const NIGERIAN_BANKS = [
  { code: "058", name: "GTBank (Guaranty Trust Bank)" },
  { code: "044", name: "Access Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "090267", name: "Kuda Microfinance Bank" },
  { code: "100004", name: "OPay Digital Services" },
];

export const SAMPLE_VERIFIED_SELFIE_BASE64 =
  "data:image/svg+xml;base64," +
  (typeof Buffer !== "undefined"
    ? Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><rect width="240" height="240" rx="24" fill="#0F172A"/><circle cx="120" cy="96" r="42" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="2.5"/><circle cx="120" cy="92" r="26" fill="#E2E8F0"/><path d="M72 186C72 156 93 138 120 138C147 138 168 156 168 186" stroke="#E2E8F0" stroke-width="14" stroke-linecap="round" fill="none"/><ellipse cx="120" cy="116" rx="68" ry="86" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="6 4"/><rect x="46" y="200" width="148" height="24" rx="12" fill="#064E3B"/><text x="120" y="216" text-anchor="middle" fill="#6EE7B7" font-family="monospace" font-size="10" font-weight="bold">3D LIVENESS: PASS 99.8%</text></svg>`
      ).toString("base64")
    : "");

function randomId(prefix: string): string {
  const chars = "0123456789abcdef";
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${suffix}`;
}

function createInitialSandboxState(): WalletStateResponse {
  const now = new Date();
  const t1 = new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString();
  const t2 = new Date(now.getTime() - 1000 * 60 * 60 * 47.9).toISOString();
  const t3 = new Date(now.getTime() - 1000 * 60 * 60 * 18).toISOString();

  const mamaRecipient: TrustedRecipient = {
    id: "rec_mama_01",
    userId: "usr_tunde_01",
    bushaRecipientId: "RCP_mama_gtb_0123456789",
    label: MAMA.label,
    bankName: MAMA.bankName,
    bankCode: MAMA.bankCode,
    accountNumber: MAMA.accountNumber,
    accountName: MAMA.accountName,
    isPreVerified: true,
    createdAt: t1,
  };

  const user: UserProfile = {
    id: "usr_tunde_01",
    phone: TUNDE.phone,
    email: TUNDE.email,
    fullName: TUNDE.fullName,
    nin: TUNDE.nin,
    bushaProfileId: "BUS_tunde99887766",
    kycStatus: "VERIFIED",
    autoSavePercent: 15,
    trustedDeviceId: "DEV_TUNDE_IPHONE_01",
    simSwapLockedUntil: null,
    createdAt: t1,
    recipients: [mamaRecipient],
  };

  const initialTransactions: WalletTransaction[] = [
    {
      id: "tx_init_remit_03",
      bushaTransferId: "TRF_9920184abc",
      quoteId: "QUO_8819201a",
      type: "FAMILY_REMIT",
      title: `Sent to ${MAMA.label}`,
      subtitle: `${MAMA.bankName} • ${MAMA.accountNumber} · Instant NGN Payout`,
      sourceCurrency: "cNGN",
      targetCurrency: "NGN",
      sourceAmount: 25000,
      targetAmount: 25000,
      rate: 1,
      status: "funds_delivered",
      recipientName: MAMA.accountName,
      recipientBank: MAMA.bankName,
      recipientAccount: MAMA.accountNumber,
      isPreVerifiedRecipient: true,
      createdAt: t3,
      timeline: [
        {
          step: "pending",
          label: "Quote Locked & Initiated",
          description: "1:1 cNGN to NGN quote QUO_8819201a authorized",
          timestamp: t3,
          completed: true,
        },
        {
          step: "processing",
          label: "Busha Liquidity Settlement",
          description: "Debited 25,000.00 cNGN from Spend balance",
          timestamp: t3,
          completed: true,
        },
        {
          step: "outgoing_payment_sent",
          label: "NIP Dispatched to GTBank",
          description: "NIBSS Instant Payment routed to 0123456789",
          timestamp: t3,
          completed: true,
        },
        {
          step: "funds_delivered",
          label: "Funds Delivered",
          description: "Confirmed credit to ABOSEDE BAKARE",
          timestamp: t3,
          completed: true,
        },
      ],
    },
    {
      id: "tx_init_split_02",
      bushaTransferId: "TRF_7712940f",
      quoteId: "QUO_7712939e",
      type: "AUTO_SAVE_SPLIT",
      title: "Auto-Save Shield (15% Split)",
      subtitle: "Converted ₦22,500 -> $14.12 USDC @ ₦1,593/$",
      sourceCurrency: "cNGN",
      targetCurrency: "USDC",
      sourceAmount: 22500,
      targetAmount: 14.12,
      rate: FX_RATE_NGN_PER_USD,
      status: "funds_converted",
      createdAt: t2,
    },
    {
      id: "tx_init_salary_01",
      bushaTransferId: "TRF_7712930a",
      quoteId: "QUO_7712925b",
      type: "SALARY_INFLOW",
      title: "Employer Salary Deposit",
      subtitle: "Konga Logistics Ltd (Payroll) · Virtual Account Pay-In",
      sourceCurrency: "NGN",
      targetCurrency: "cNGN",
      sourceAmount: 150000,
      targetAmount: 150000,
      rate: 1,
      status: "funds_delivered",
      createdAt: t1,
    },
  ];

  const initialTelemetry: TelemetryLogEntry[] = [
    {
      id: "tel_init_03",
      timestamp: t2,
      direction: "OUTGOING_API",
      method: "POST",
      endpoint: "/v1/transfers",
      status: 201,
      durationMs: 84,
      mode: "MOCK",
      headers: {
        Authorization: "Bearer bu_live_****************",
        "Content-Type": "application/json",
        "X-BU-PROFILE-ID": "BUS_tunde99887766",
        "X-Request-ID": "req_split_85_15_auto",
      },
      requestBody: {
        quote_id: "QUO_7712939e",
        reference: "duro_autosave_15pct_init",
      },
      responseBody: {
        status: "success",
        data: {
          id: "TRF_7712940f",
          status: "funds_converted",
          source_currency: "cNGN",
          target_currency: "USDC",
          source_amount: "22500.00",
          target_amount: "14.12",
        },
      },
    },
    {
      id: "tel_init_02",
      timestamp: t1,
      direction: "INCOMING_WEBHOOK",
      method: "POST",
      endpoint: "/api/webhooks/busha (transfer.funds_received)",
      status: 200,
      durationMs: 42,
      mode: "MOCK",
      headers: {
        "x-bu-signature":
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        "content-type": "application/json",
      },
      requestBody: {
        event: "transfer.funds_received",
        data: {
          id: "TRF_7712930a",
          profile_id: "BUS_tunde99887766",
          amount: 150000,
          currency: "NGN",
          sender_name: "KONGA LOGISTICS LTD",
        },
      },
      responseBody: {
        acknowledged: true,
        credited_cngn: 127500,
        auto_saved_cngn: 22500,
        auto_saved_usdc: 14.12,
      },
    },
    {
      id: "tel_init_01",
      timestamp: t1,
      direction: "OUTGOING_API",
      method: "POST",
      endpoint: "/v1/customers",
      status: 201,
      durationMs: 112,
      mode: "MOCK",
      headers: {
        Authorization: "Bearer bu_live_****************",
        "Content-Type": "application/json",
        "X-Request-ID": "req_onboard_tunde_01",
      },
      requestBody: {
        type: "individual",
        email: TUNDE.email,
        first_name: "Tunde",
        last_name: "Bakare",
        phone_number: TUNDE.phone,
        country: "NG",
        has_accepted_terms: true,
      },
      responseBody: {
        status: "success",
        data: {
          id: "BUS_tunde99887766",
          type: "individual",
          status: "verified",
        },
      },
    },
  ];

  const insights: BushaInsightSummary = {
    currency: "NGN",
    summary: {
      total_inflow: 450000,
      total_outflow: 162500,
      net_cash_flow: 287500,
      savings_retention_rate: 18.4,
      verified_employer: "Konga Logistics Ltd (Payroll)",
    },
    series: [
      { date: "2026-06", label: "Jun", inflow: 140000, outflow: 95000, net: 45000 },
      { date: "2026-07", label: "Jul", inflow: 150000, outflow: 92000, net: 58000 },
      { date: "2026-08", label: "Aug", inflow: 150000, outflow: 88000, net: 62000 },
      { date: "2026-09", label: "Sep", inflow: 165000, outflow: 94000, net: 71000 },
      { date: "2026-10", label: "Oct", inflow: 150000, outflow: 81000, net: 69000 },
      { date: "2026-11", label: "Nov", inflow: 150000, outflow: 47500, net: 102500 },
    ],
  };

  return {
    user,
    balances: {
      cNGN: {
        currency: "cNGN",
        name: "Digital Naira (Spend)",
        total_balance: 102500,
        available_balance: 102500,
        pending_balance: 0,
        is_fiat: false,
      },
      USDC: {
        currency: "USDC",
        name: "USD Coin (Save Shield)",
        total_balance: 64.12,
        available_balance: 64.12,
        pending_balance: 0,
        locked_balance: 0,
        is_fiat: false,
      },
      fxRateNgnPerUsd: FX_RATE_NGN_PER_USD,
    },
    virtualAccount: null,
    transactions: initialTransactions,
    insights,
    pledges: [],
    telemetry: initialTelemetry,
    security: {
      isSimSwapLocked: false,
      lockedUntil: null,
      activeDeviceId: "DEV_TUNDE_IPHONE_01",
      trustedDeviceId: "DEV_TUNDE_IPHONE_01",
      lockReason: null,
    },
    backendConnected: false,
  };
}

function loadLocalState(): WalletStateResponse {
  if (typeof window === "undefined") {
    return createInitialSandboxState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSandboxState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as WalletStateResponse;
  } catch {
    return createInitialSandboxState();
  }
}

function saveLocalState(state: WalletStateResponse): WalletStateResponse {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }
  return state;
}

function appendTelemetry(
  state: WalletStateResponse,
  entry: Omit<TelemetryLogEntry, "id" | "timestamp">
) {
  const log: TelemetryLogEntry = {
    ...entry,
    id: randomId("tel"),
    timestamp: new Date().toISOString(),
  };
  state.telemetry = [log, ...state.telemetry.slice(0, 39)];
}

function checkVelocityLock(
  state: WalletStateResponse,
  activeDeviceId: string
): { locked: boolean; lockedUntil: string | null; reason: string | null } {
  const now = new Date();
  if (activeDeviceId !== state.user.trustedDeviceId) {
    const lockUntil =
      state.user.simSwapLockedUntil &&
      new Date(state.user.simSwapLockedUntil) > now
        ? state.user.simSwapLockedUntil
        : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    state.user.simSwapLockedUntil = lockUntil;
    state.security = {
      isSimSwapLocked: true,
      lockedUntil: lockUntil,
      activeDeviceId,
      trustedDeviceId: state.user.trustedDeviceId,
      lockReason: `Unrecognized device fingerprint (${activeDeviceId}) detected. 24-hour SIM-Swap cooling-off lock active.`,
    };
    return {
      locked: true,
      lockedUntil: lockUntil,
      reason: state.security.lockReason,
    };
  }

  if (
    state.user.simSwapLockedUntil &&
    new Date(state.user.simSwapLockedUntil) > now
  ) {
    state.security = {
      isSimSwapLocked: true,
      lockedUntil: state.user.simSwapLockedUntil,
      activeDeviceId,
      trustedDeviceId: state.user.trustedDeviceId,
      lockReason: `24-hour cooling-off lock active until ${new Date(
        state.user.simSwapLockedUntil
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    };
    return {
      locked: true,
      lockedUntil: state.user.simSwapLockedUntil,
      reason: state.security.lockReason,
    };
  }

  state.security = {
    isSimSwapLocked: false,
    lockedUntil: null,
    activeDeviceId,
    trustedDeviceId: state.user.trustedDeviceId,
    lockReason: null,
  };
  return { locked: false, lockedUntil: null, reason: null };
}

/**
 * Maps the `origin/dev` backend `WalletSnapshot` (`GET /api/wallet`) into `WalletStateResponse`.
 */
function applyBackendSnapshot(
  local: WalletStateResponse,
  snap: WalletSnapshot,
  activeDeviceId: string
): WalletStateResponse {
  local.backendConnected = true;
  local.user = {
    id: snap.profile.id,
    fullName: snap.profile.fullName,
    phone: snap.profile.phone,
    email: snap.profile.email,
    nin: local.user.nin || TUNDE.nin,
    bushaProfileId: snap.profile.bushaProfileId,
    kycStatus: (snap.profile.kycStatus as "VERIFIED" | "PENDING" | "UNVERIFIED") || "VERIFIED",
    autoSavePercent: snap.profile.autoSavePercent,
    trustedDeviceId: snap.profile.trustedDeviceId,
    simSwapLockedUntil: snap.lock.until,
    createdAt: snap.profile.createdAt,
    recipients: snap.recipients.map((r) => ({
      id: r.id,
      userId: snap.profile.id,
      bushaRecipientId: r.bushaRecipientId,
      label: r.label,
      bankName: r.bankName,
      bankCode: r.bankCode,
      accountNumber: r.accountNumber,
      accountName: r.accountName,
      isPreVerified: r.isPreVerified,
      createdAt: snap.profile.createdAt,
    })),
  };

  if (snap.balances) {
    local.balances = {
      cNGN: {
        currency: "cNGN",
        name: "Digital Naira (Spend)",
        total_balance: snap.balances.spend.total,
        available_balance: snap.balances.spend.available,
        pending_balance: snap.balances.spend.pending,
        is_fiat: false,
      },
      USDC: {
        currency: "USDC",
        name: "USD Coin (Save Shield)",
        total_balance: snap.balances.save.total,
        available_balance: snap.balances.save.available,
        pending_balance: snap.balances.save.locked,
        locked_balance: snap.balances.save.locked,
        is_fiat: false,
      },
      fxRateNgnPerUsd: snap.rate?.usdNgn || FX_RATE_NGN_PER_USD,
    };
  }

  local.security = {
    isSimSwapLocked: snap.lock.active,
    lockedUntil: snap.lock.until,
    activeDeviceId: snap.device.id || activeDeviceId,
    trustedDeviceId: snap.lock.trustedDeviceId,
    lockReason: snap.lock.active
      ? `24-hour SIM-Swap cooling-off lock active on device ${snap.device.id || activeDeviceId}.`
      : null,
  };

  if (Array.isArray(snap.transactions) && snap.transactions.length > 0) {
    local.transactions = snap.transactions.map((tx) => {
      const txType: WalletTransaction["type"] =
        tx.kind === "DEPOSIT"
          ? "SALARY_INFLOW"
          : tx.kind === "AUTO_SAVE"
          ? "AUTO_SAVE_SPLIT"
          : tx.kind === "CONVERSION"
          ? "MANUAL_SWAP"
          : tx.kind === "PLEDGE_ADVANCE"
          ? "RENT_ADVANCE_PLEDGE"
          : "FAMILY_REMIT";

      const rawTimeline = (tx.meta as { timeline?: { step: string; label?: string; timestamp?: string; at?: string }[] } | null)?.timeline;
      const timeline: TransferTimelineStep[] | undefined = Array.isArray(rawTimeline)
        ? rawTimeline.map((st) => ({
            step: (st.step as TransferStageStatus) || "funds_delivered",
            label: st.label || st.step,
            description: `Busha stage: ${st.step}`,
            timestamp: st.timestamp || st.at || new Date(tx.createdAt).toISOString(),
            completed: true,
          }))
        : undefined;

      return {
        id: tx.id,
        bushaTransferId: tx.bushaTransferId || tx.id,
        quoteId: tx.bushaQuoteId || "QUO_Busha",
        type: txType,
        title: tx.description,
        subtitle: `${tx.currency} ${tx.direction === "IN" ? "Credit" : "Transfer"} · ${tx.status}`,
        sourceCurrency: (tx.currency as "NGN" | "cNGN" | "USDC") || "cNGN",
        targetCurrency:
          ((tx.counterCurrency || tx.currency) as "NGN" | "cNGN" | "USDC") || "NGN",
        sourceAmount: Number(tx.amount),
        targetAmount: Number(tx.counterAmount ?? tx.amount),
        rate: snap.rate?.usdNgn || FX_RATE_NGN_PER_USD,
        status: (tx.status as TransferStageStatus) || "funds_delivered",
        createdAt: new Date(tx.createdAt).toISOString(),
        timeline,
      };
    });
  }

  if (Array.isArray(snap.logs) && snap.logs.length > 0) {
    local.telemetry = snap.logs.map((l) => ({
      id: l.id,
      timestamp: new Date(l.createdAt).toISOString(),
      direction:
        l.direction === "INCOMING_WEBHOOK"
          ? "INCOMING_WEBHOOK"
          : l.direction === "GUARD"
          ? "SECURITY_GUARD"
          : "OUTGOING_API",
      method:
        l.method === "GET"
          ? "GET"
          : l.direction === "GUARD"
          ? "GUARD"
          : "POST",
      endpoint: l.path,
      status: l.status ?? 200,
      durationMs: l.durationMs ?? 50,
      mode: (l.mode as BushaApiMode) || "MOCK",
      headers: l.requestHeaders || {},
      requestBody: l.requestBody,
      responseBody: l.responseBody,
    }));
  }

  return local;
}

/**
 * Calls the Next.js backend `/api/*` route using the `{ ok, data, error }` envelope.
 * If DATABASE_URL is not configured in the preview container (status 500 with DATABASE_URL message),
 * returns `handledByBackend: false` so the local Busha sandbox handles it seamlessly.
 */
async function callBackendApi<T>(
  path: string,
  options: RequestInit,
  activeDeviceId: string,
  mode: BushaApiMode
): Promise<{
  handledByBackend: boolean;
  ok: boolean;
  status: number;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-device-id": activeDeviceId,
        "x-busha-mode": mode,
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as
      | { ok: true; data: T }
      | { ok: false; error: { code?: string; message?: string } }
      | null;

    if (!json || typeof json.ok !== "boolean") {
      return { handledByBackend: false, ok: false, status: res.status };
    }

    if (!json.ok) {
      const msg = json.error?.message || "Request failed";
      const code = json.error?.code;
      // If Neon DATABASE_URL is not set in local preview environment, fall back cleanly
      if (res.status === 500 && msg.includes("DATABASE_URL")) {
        return { handledByBackend: false, ok: false, status: 500 };
      }
      return {
        handledByBackend: true,
        ok: false,
        status: res.status,
        errorCode: code,
        errorMessage: msg,
      };
    }

    return {
      handledByBackend: true,
      ok: true,
      status: res.status,
      data: json.data,
    };
  } catch {
    return { handledByBackend: false, ok: false, status: 0 };
  }
}

export const DuroApiClient = {
  /**
   * GET /api/wallet
   */
  async getWallet(
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<WalletStateResponse> {
    let backend = await callBackendApi<WalletSnapshot>(
      "/api/wallet",
      { method: "GET" },
      activeDeviceId,
      mode
    );

    // Auto-seed Tunde in Neon if the database has no profile yet (NOT_ONBOARDED)
    if (backend.handledByBackend && !backend.ok && backend.errorCode === "NOT_ONBOARDED") {
      await callBackendApi(
        "/api/onboarding",
        { method: "POST", body: JSON.stringify({}) },
        activeDeviceId,
        mode
      );
      backend = await callBackendApi<WalletSnapshot>(
        "/api/wallet",
        { method: "GET" },
        activeDeviceId,
        mode
      );
    }

    const local = loadLocalState();
    if (backend.handledByBackend && backend.ok && backend.data) {
      return saveLocalState(
        applyBackendSnapshot(local, backend.data, activeDeviceId)
      );
    }

    checkVelocityLock(local, activeDeviceId);
    local.backendConnected = false;
    return saveLocalState(local);
  },

  /**
   * POST /api/onboarding
   */
  async completeOnboarding(
    payload: {
      fullName: string;
      phone: string;
      email: string;
      nin: string;
      selfieImage: string;
    },
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<WalletStateResponse> {
    const cleanPhone = payload.phone.replace(/\s+/g, "");
    const backend = await callBackendApi(
      "/api/onboarding",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: payload.fullName.trim(),
          phone: cleanPhone,
          email: payload.email.trim(),
          nin: payload.nin.trim(),
          selfieImage: payload.selfieImage,
        }),
      },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend) {
      if (!backend.ok) {
        throw new Error(backend.errorMessage || "Onboarding failed");
      }
      return this.getWallet(activeDeviceId, mode);
    }

    const state = loadLocalState();
    const customerId = state.user.bushaProfileId || "BUS_tunde99887766";
    state.user = {
      ...state.user,
      fullName: payload.fullName.trim(),
      phone: cleanPhone,
      email: payload.email.trim(),
      nin: payload.nin.trim(),
      kycStatus: "VERIFIED",
      trustedDeviceId: activeDeviceId,
      simSwapLockedUntil: null,
    };

    appendTelemetry(state, {
      direction: "OUTGOING_API",
      method: "POST",
      endpoint: `/v1/customers/${customerId}/verify`,
      status: 200,
      durationMs: 145,
      mode,
      headers: {
        Authorization: "Bearer bu_live_****************",
        "Content-Type": "application/json",
        "X-BU-PROFILE-ID": customerId,
        "X-Request-ID": randomId("req_kyc"),
      },
      requestBody: {
        country: "NG",
        document_type: "nin",
        document_number: payload.nin,
        selfie_image: payload.selfieImage.slice(0, 48) + "...[base64]",
      },
      responseBody: {
        status: "success",
        data: { id: customerId, status: "verified" },
      },
    });

    checkVelocityLock(state, activeDeviceId);
    return saveLocalState(state);
  },

  /**
   * POST /api/fund
   */
  async generateFundingAccount(
    amountNgn: number,
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<WalletStateResponse> {
    const backend = await callBackendApi<FundResponse>(
      "/api/fund",
      {
        method: "POST",
        body: JSON.stringify({ amountNgn, source: "EMPLOYER" }),
      },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend && backend.ok && backend.data) {
      const next = await this.getWallet(activeDeviceId, mode);
      const va = backend.data.virtualAccount;
      next.virtualAccount = {
        type: "temporary_bank_account",
        bank_name: va.bankName,
        account_number: va.accountNumber,
        account_name: va.accountName,
        expires_at: va.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        expected_amount_ngn: amountNgn,
        quote_id: backend.data.quote.id,
        transfer_id: backend.data.transferId,
      };
      return saveLocalState(next);
    }

    const state = loadLocalState();
    const quoteId = randomId("QUO");
    const transferId = randomId("TRF");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const virtualAccount: VirtualAccountPayIn = {
      type: "temporary_bank_account",
      bank_name: "Providus Bank (Busha)",
      account_number: "9981234567",
      account_name: `BUSHA / ${state.user.fullName.toUpperCase()}`,
      expires_at: expiresAt,
      expected_amount_ngn: amountNgn,
      quote_id: quoteId,
      transfer_id: transferId,
    };

    appendTelemetry(state, {
      direction: "OUTGOING_API",
      method: "POST",
      endpoint: "/v1/transfers",
      status: 201,
      durationMs: 92,
      mode,
      headers: {
        Authorization: "Bearer bu_live_****************",
        "X-BU-PROFILE-ID": state.user.bushaProfileId,
        "X-Request-ID": randomId("req_trf"),
      },
      requestBody: { quote_id: quoteId, reference: `duro_payin_${Date.now()}` },
      responseBody: {
        status: "success",
        data: { id: transferId, quote_id: quoteId, status: "pending", pay_in: virtualAccount },
      },
    });

    state.virtualAccount = virtualAccount;
    return saveLocalState(state);
  },

  /**
   * POST /api/simulate/salary
   * Triggers signed HMAC webhook to /api/webhooks/busha & auto-splits 85% cNGN / 15% USDC
   */
  async simulateSalaryWebhook(
    amountNgn: number = 150000,
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<WalletStateResponse> {
    const backend = await callBackendApi(
      "/api/simulate/salary",
      {
        method: "POST",
        body: JSON.stringify({ amountNgn, source: "EMPLOYER" }),
      },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend && backend.ok) {
      return this.getWallet(activeDeviceId, mode);
    }

    const state = loadLocalState();
    const splitPct = state.user.autoSavePercent;
    const autoSaveNgn = Math.round((amountNgn * splitPct) / 100);
    const netSpendNgn = amountNgn - autoSaveNgn;
    const convertedUsdc = Number((autoSaveNgn / FX_RATE_NGN_PER_USD).toFixed(2));

    state.balances.cNGN.available_balance += netSpendNgn;
    state.balances.cNGN.total_balance += netSpendNgn;
    state.balances.USDC.available_balance = Number(
      (state.balances.USDC.available_balance + convertedUsdc).toFixed(2)
    );
    state.balances.USDC.total_balance = Number(
      (state.balances.USDC.total_balance + convertedUsdc).toFixed(2)
    );

    state.insights.summary.total_inflow += amountNgn;
    state.insights.summary.net_cash_flow += amountNgn;

    const nowIso = new Date().toISOString();
    const salaryTx: WalletTransaction = {
      id: randomId("tx"),
      bushaTransferId: randomId("TRF"),
      quoteId: randomId("QUO"),
      type: "SALARY_INFLOW",
      title: "Employer Salary Inflow",
      subtitle: `Konga Logistics Ltd · ₦${netSpendNgn.toLocaleString()} to Spend`,
      sourceCurrency: "NGN",
      targetCurrency: "cNGN",
      sourceAmount: amountNgn,
      targetAmount: amountNgn,
      rate: 1,
      status: "funds_delivered",
      createdAt: nowIso,
    };

    const splitTx: WalletTransaction = {
      id: randomId("tx"),
      bushaTransferId: randomId("TRF"),
      quoteId: randomId("QUO"),
      type: "AUTO_SAVE_SPLIT",
      title: `Auto-Save Shield (${splitPct}% Split)`,
      subtitle: `Converted ₦${autoSaveNgn.toLocaleString()} -> $${convertedUsdc.toFixed(
        2
      )} USDC @ ₦${FX_RATE_NGN_PER_USD.toLocaleString()}/$`,
      sourceCurrency: "cNGN",
      targetCurrency: "USDC",
      sourceAmount: autoSaveNgn,
      targetAmount: convertedUsdc,
      rate: FX_RATE_NGN_PER_USD,
      status: "funds_converted",
      createdAt: new Date(Date.now() + 50).toISOString(),
    };

    state.transactions = [splitTx, salaryTx, ...state.transactions];

    appendTelemetry(state, {
      direction: "INCOMING_WEBHOOK",
      method: "POST",
      endpoint: "/api/webhooks/busha (transfer.funds_received)",
      status: 200,
      durationMs: 38,
      mode,
      headers: {
        "x-bu-signature": "sha256_hmac_verified_" + Date.now().toString(16),
      },
      requestBody: { event: "transfer.funds_received", amount: amountNgn },
      responseBody: {
        credited_cngn: netSpendNgn,
        auto_saved_usdc: convertedUsdc,
      },
    });

    return saveLocalState(state);
  },

  /**
   * POST /api/split
   */
  async updateSplitOrSwap(
    payload: {
      autoSavePercent?: number;
      swap?: {
        direction: "CNGN_TO_USDC" | "USDC_TO_CNGN";
        amount: number;
      };
    },
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<{ state: WalletStateResponse; error?: string }> {
    if (typeof payload.autoSavePercent === "number") {
      const backend = await callBackendApi(
        "/api/split",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SET_PERCENT",
            percent: payload.autoSavePercent,
          }),
        },
        activeDeviceId,
        mode
      );
      if (backend.handledByBackend) {
        const next = await this.getWallet(activeDeviceId, mode);
        return { state: next, error: backend.ok ? undefined : backend.errorMessage };
      }
    }

    if (payload.swap) {
      const backendDirection =
        payload.swap.direction === "CNGN_TO_USDC"
          ? "SPEND_TO_SAVE"
          : "SAVE_TO_SPEND";
      const backend = await callBackendApi(
        "/api/split",
        {
          method: "POST",
          body: JSON.stringify({
            action: "MOVE",
            direction: backendDirection,
            amount: payload.swap.amount,
          }),
        },
        activeDeviceId,
        mode
      );
      if (backend.handledByBackend) {
        const next = await this.getWallet(activeDeviceId, mode);
        return { state: next, error: backend.ok ? undefined : backend.errorMessage };
      }
    }

    const state = loadLocalState();
    const lockCheck = checkVelocityLock(state, activeDeviceId);

    if (typeof payload.autoSavePercent === "number") {
      state.user.autoSavePercent = Math.max(0, Math.min(50, payload.autoSavePercent));
    }

    if (payload.swap) {
      const { direction, amount } = payload.swap;
      if (direction === "USDC_TO_CNGN" && lockCheck.locked) {
        const errMsg =
          "Your Save balance is frozen for 24 hours because we noticed a new device. Verify your identity to unlock.";
        appendTelemetry(state, {
          direction: "SECURITY_GUARD",
          method: "GUARD",
          endpoint: "velocity-guard/save_withdraw",
          status: 423,
          durationMs: 11,
          mode,
          headers: { "x-device-id": activeDeviceId },
          requestBody: payload.swap,
          responseBody: { code: "VELOCITY_LOCKED", message: errMsg },
        });
        saveLocalState(state);
        return { state, error: errMsg };
      }

      if (direction === "CNGN_TO_USDC") {
        if (amount > state.balances.cNGN.available_balance) {
          return {
            state,
            error: `Insufficient Spend (cNGN) balance. Available: ₦${state.balances.cNGN.available_balance.toLocaleString()}`,
          };
        }
        const targetUsdc = Number((amount / FX_RATE_NGN_PER_USD).toFixed(2));
        state.balances.cNGN.available_balance -= amount;
        state.balances.cNGN.total_balance -= amount;
        state.balances.USDC.available_balance = Number(
          (state.balances.USDC.available_balance + targetUsdc).toFixed(2)
        );
        state.balances.USDC.total_balance = Number(
          (state.balances.USDC.total_balance + targetUsdc).toFixed(2)
        );
        state.transactions = [
          {
            id: randomId("tx"),
            bushaTransferId: randomId("TRF"),
            quoteId: randomId("QUO"),
            type: "MANUAL_SWAP",
            title: "Moved Spend to Dollar Save",
            subtitle: `Converted ₦${amount.toLocaleString()} -> $${targetUsdc.toFixed(2)} USDC`,
            sourceCurrency: "cNGN",
            targetCurrency: "USDC",
            sourceAmount: amount,
            targetAmount: targetUsdc,
            rate: FX_RATE_NGN_PER_USD,
            status: "funds_converted",
            createdAt: new Date().toISOString(),
          },
          ...state.transactions,
        ];
      } else {
        if (amount > state.balances.USDC.available_balance) {
          return {
            state,
            error: `Insufficient available Save (USDC) balance. Available: $${state.balances.USDC.available_balance.toFixed(2)}`,
          };
        }
        const targetCngn = Math.round(amount * FX_RATE_NGN_PER_USD);
        state.balances.USDC.available_balance = Number(
          (state.balances.USDC.available_balance - amount).toFixed(2)
        );
        state.balances.USDC.total_balance = Number(
          (state.balances.USDC.total_balance - amount).toFixed(2)
        );
        state.balances.cNGN.available_balance += targetCngn;
        state.balances.cNGN.total_balance += targetCngn;
        state.transactions = [
          {
            id: randomId("tx"),
            bushaTransferId: randomId("TRF"),
            quoteId: randomId("QUO"),
            type: "MANUAL_SWAP",
            title: "Withdrew Dollar Save to Spend",
            subtitle: `Converted $${amount.toFixed(2)} USDC -> ₦${targetCngn.toLocaleString()} cNGN`,
            sourceCurrency: "USDC",
            targetCurrency: "cNGN",
            sourceAmount: amount,
            targetAmount: targetCngn,
            rate: FX_RATE_NGN_PER_USD,
            status: "funds_converted",
            createdAt: new Date().toISOString(),
          },
          ...state.transactions,
        ];
      }
    }

    return { state: saveLocalState(state) };
  },

  /**
   * POST /api/remit
   */
  async sendRemittance(
    payload: {
      recipientId?: string;
      newRecipient?: {
        label: string;
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
      };
      amountNgn: number;
      narration?: string;
    },
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<{
    state: WalletStateResponse;
    transaction?: WalletTransaction;
    error?: string;
  }> {
    const backend = await callBackendApi<RemitResponse>(
      "/api/remit",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend) {
      const next = await this.getWallet(activeDeviceId, mode);
      if (!backend.ok) {
        return { state: next, error: backend.errorMessage };
      }
      return {
        state: next,
        transaction: next.transactions[0],
      };
    }

    const state = loadLocalState();
    const lockCheck = checkVelocityLock(state, activeDeviceId);
    let targetRecipient: TrustedRecipient | undefined;

    if (payload.newRecipient) {
      targetRecipient = {
        id: randomId("rec"),
        userId: state.user.id,
        bushaRecipientId: randomId("RCP"),
        label: payload.newRecipient.label || payload.newRecipient.accountName,
        bankCode: payload.newRecipient.bankCode,
        bankName: payload.newRecipient.bankName,
        accountNumber: payload.newRecipient.accountNumber,
        accountName: payload.newRecipient.accountName.toUpperCase(),
        isPreVerified: false,
        createdAt: new Date().toISOString(),
      };
      state.user.recipients = [...state.user.recipients, targetRecipient];
    } else if (payload.recipientId) {
      targetRecipient = state.user.recipients.find((r) => r.id === payload.recipientId);
    }

    if (!targetRecipient) {
      return { state, error: "Please select or add a valid Nigerian bank recipient." };
    }

    if (lockCheck.locked && !targetRecipient.isPreVerified) {
      const errMsg =
        "For your safety, you can only send to saved family recipients for the next 24 hours.";
      appendTelemetry(state, {
        direction: "SECURITY_GUARD",
        method: "GUARD",
        endpoint: "velocity-guard/remit",
        status: 423,
        durationMs: 14,
        mode,
        headers: { "x-device-id": activeDeviceId },
        requestBody: { recipient: targetRecipient.label, amountNgn: payload.amountNgn },
        responseBody: { code: "UNVERIFIED_RECIPIENT_LOCKED", message: errMsg },
      });
      saveLocalState(state);
      return { state, error: errMsg };
    }

    if (payload.amountNgn > state.balances.cNGN.available_balance) {
      return {
        state,
        error: `Insufficient Spend (cNGN) balance. Available: ₦${state.balances.cNGN.available_balance.toLocaleString()}`,
      };
    }

    state.balances.cNGN.available_balance -= payload.amountNgn;
    state.balances.cNGN.total_balance -= payload.amountNgn;

    const quoteId = randomId("QUO");
    const transferId = randomId("TRF");
    const now = Date.now();

    const timeline: TransferTimelineStep[] = [
      {
        step: "pending",
        label: "Quote Locked & Created",
        description: `1:1 cNGN -> NGN payout quote (${quoteId}) authorized`,
        timestamp: new Date(now).toISOString(),
        completed: true,
      },
      {
        step: "processing",
        label: "Busha Treasury Settlement",
        description: `Debited ₦${payload.amountNgn.toLocaleString()} cNGN from Spend balance`,
        timestamp: new Date(now + 1200).toISOString(),
        completed: true,
      },
      {
        step: "outgoing_payment_sent",
        label: "NIP Dispatched to Bank",
        description: `Routed via NIBSS Instant Payment to ${targetRecipient.bankName} (${targetRecipient.accountNumber})`,
        timestamp: new Date(now + 2400).toISOString(),
        completed: true,
      },
      {
        step: "funds_delivered",
        label: "Funds Delivered",
        description: `Confirmed credit to ${targetRecipient.accountName}`,
        timestamp: new Date(now + 3600).toISOString(),
        completed: true,
      },
    ];

    const tx: WalletTransaction = {
      id: randomId("tx"),
      bushaTransferId: transferId,
      quoteId,
      type: "FAMILY_REMIT",
      title: `Sent to ${targetRecipient.label}`,
      subtitle: `${targetRecipient.bankName} • ${targetRecipient.accountNumber}`,
      sourceCurrency: "cNGN",
      targetCurrency: "NGN",
      sourceAmount: payload.amountNgn,
      targetAmount: payload.amountNgn,
      rate: 1,
      status: "funds_delivered",
      recipientName: targetRecipient.accountName,
      recipientBank: targetRecipient.bankName,
      recipientAccount: targetRecipient.accountNumber,
      isPreVerifiedRecipient: targetRecipient.isPreVerified,
      createdAt: new Date(now).toISOString(),
      timeline,
    };

    state.transactions = [tx, ...state.transactions];
    return { state: saveLocalState(state), transaction: tx };
  },

  /**
   * POST /api/passport
   */
  async createRentAdvancePledge(
    payload: { collateralUsdc: number; advanceNgn: number },
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<{ state: WalletStateResponse; error?: string }> {
    const backend = await callBackendApi<PledgeAdvanceResponse>(
      "/api/passport",
      {
        method: "POST",
        body: JSON.stringify({
          advanceNgn: payload.advanceNgn,
          purpose: "RENT",
        }),
      },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend) {
      const next = await this.getWallet(activeDeviceId, mode);
      if (!backend.ok) {
        return { state: next, error: backend.errorMessage };
      }
      if (backend.data) {
        const plg = backend.data.pledge;
        next.pledges = [
          {
            id: plg.id,
            quoteId: "PQUO_Busha",
            collateralUsdc: backend.data.collateralUsdc,
            advanceNgn: backend.data.advanceNgn,
            ltvPercent: backend.data.ltv || 66.7,
            aprPercent: 0,
            status: "authorized",
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
          ...next.pledges,
        ];
      }
      return { state: saveLocalState(next) };
    }

    const state = loadLocalState();
    const lockCheck = checkVelocityLock(state, activeDeviceId);
    if (lockCheck.locked) {
      return {
        state,
        error:
          "Your Save balance is frozen for 24 hours because we noticed a new device. Verify your identity to unlock.",
      };
    }

    if (payload.collateralUsdc > state.balances.USDC.available_balance) {
      return {
        state,
        error: `Insufficient available USDC collateral. Available: $${state.balances.USDC.available_balance.toFixed(2)} USDC`,
      };
    }

    const pledgeId = randomId("PLG");
    state.balances.USDC.available_balance = Number(
      (state.balances.USDC.available_balance - payload.collateralUsdc).toFixed(2)
    );
    state.balances.USDC.locked_balance = Number(
      ((state.balances.USDC.locked_balance || 0) + payload.collateralUsdc).toFixed(2)
    );
    state.balances.cNGN.available_balance += payload.advanceNgn;
    state.balances.cNGN.total_balance += payload.advanceNgn;

    const newPledge: ActivePledge = {
      id: pledgeId,
      quoteId: randomId("PQUO"),
      collateralUsdc: payload.collateralUsdc,
      advanceNgn: payload.advanceNgn,
      ltvPercent: 75,
      aprPercent: 0,
      status: "authorized",
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    state.pledges = [newPledge, ...state.pledges];
    return { state: saveLocalState(state) };
  },

  /**
   * GET /api/passport?consent=true&interval=monthly
   */
  async fetchPassportInsights(
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<WalletStateResponse> {
    const backend = await callBackendApi<PassportStatementResponse>(
      "/api/passport?consent=true&interval=monthly",
      { method: "GET" },
      activeDeviceId,
      mode
    );

    if (backend.handledByBackend && backend.ok && backend.data) {
      const next = await this.getWallet(activeDeviceId, mode);
      const stmt = backend.data.statement;
      next.insights = {
        currency: "NGN",
        summary: {
          total_inflow: stmt.summary.totalInflow,
          total_outflow: stmt.summary.totalOutflow,
          net_cash_flow: stmt.summary.netCashFlow,
          savings_retention_rate: 18.4,
          verified_employer: "Konga Logistics Ltd (Payroll)",
        },
        series: stmt.series.map((s) => ({
          date: s.date,
          label: s.date.slice(-2),
          inflow: s.inflow,
          outflow: s.outflow,
          net: s.net,
        })),
      };
      return saveLocalState(next);
    }

    return loadLocalState();
  },

  /**
   * POST /api/security/sim-swap
   */
  async handleSimSwapSecurity(
    payload: {
      action: "SIMULATE_ATTACK" | "RECOVER_IDENTITY";
      nin?: string;
      selfieImage?: string;
      newDeviceId?: string;
    },
    activeDeviceId: string,
    mode: BushaApiMode
  ): Promise<{
    state: WalletStateResponse;
    nextDeviceId: string;
    error?: string;
  }> {
    const targetDeviceId =
      payload.action === "SIMULATE_ATTACK"
        ? payload.newDeviceId || "DEV_HACKER_99"
        : activeDeviceId;

    const backendBody =
      payload.action === "SIMULATE_ATTACK"
        ? { action: "SIMULATE_ATTACK", attackerDeviceId: targetDeviceId }
        : {
            action: "RECOVER_IDENTITY",
            nin: (payload.nin || "").trim(),
            selfieImage: payload.selfieImage || SAMPLE_VERIFIED_SELFIE_BASE64,
          };

    const backend = await callBackendApi<SimSwapResponse>(
      "/api/security/sim-swap",
      {
        method: "POST",
        body: JSON.stringify(backendBody),
      },
      targetDeviceId,
      mode
    );

    if (backend.handledByBackend) {
      if (!backend.ok) {
        const next = await this.getWallet(targetDeviceId, mode);
        return {
          state: next,
          nextDeviceId: targetDeviceId,
          error: backend.errorMessage,
        };
      }
      const resolvedDevice = backend.data?.deviceId || targetDeviceId;
      const next = await this.getWallet(resolvedDevice, mode);
      return { state: next, nextDeviceId: resolvedDevice };
    }

    const state = loadLocalState();
    if (payload.action === "SIMULATE_ATTACK") {
      const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      state.user.simSwapLockedUntil = lockUntil;
      state.security = {
        isSimSwapLocked: true,
        lockedUntil: lockUntil,
        activeDeviceId: targetDeviceId,
        trustedDeviceId: state.user.trustedDeviceId,
        lockReason: `Unrecognized device header (x-device-id: ${targetDeviceId}) detected. 24-hour SIM-Swap Velocity Lock engaged.`,
      };
      return { state: saveLocalState(state), nextDeviceId: targetDeviceId };
    }

    const submittedNin = (payload.nin || "").trim();
    if (submittedNin.length < 11) {
      return {
        state,
        nextDeviceId: activeDeviceId,
        error: "Please enter a valid 11-digit National Identification Number (NIN).",
      };
    }

    const verifiedDevice =
      activeDeviceId === "DEV_HACKER_99"
        ? "DEV_TUNDE_NEW_PHONE_02"
        : activeDeviceId;

    state.user.trustedDeviceId = verifiedDevice;
    state.user.simSwapLockedUntil = null;
    state.security = {
      isSimSwapLocked: false,
      lockedUntil: null,
      activeDeviceId: verifiedDevice,
      trustedDeviceId: verifiedDevice,
      lockReason: null,
    };

    return { state: saveLocalState(state), nextDeviceId: verifiedDevice };
  },

  resetSandbox(): WalletStateResponse {
    const fresh = createInitialSandboxState();
    return saveLocalState(fresh);
  },
};
