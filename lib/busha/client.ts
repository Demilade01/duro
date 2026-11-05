/**
 * BushaClient — one SDK, two transports.
 *
 *  - LIVE: real HTTPS calls to the Busha sandbox/production API.
 *  - MOCK: the same request (method, path, headers, body) is dispatched to the
 *          stateful MockBushaStore instead of the network.
 *
 * Both transports flow through a single `request()` choke point, so the Judge
 * telemetry inspector shows byte-identical traffic regardless of mode.
 */
import { randomUUID } from "node:crypto";
import { BushaApiError, DuroError } from "@/lib/errors";
import { logApi } from "@/lib/telemetry";
import { fromMinor, toMinor } from "@/lib/money";
import { handleMockRequest } from "./mock-store";
import type {
  BushaBalance,
  BushaCustomer,
  BushaErrorBody,
  BushaMode,
  BushaPledge,
  BushaPledgeQuote,
  BushaQuote,
  BushaRecipient,
  BushaSuccess,
  BushaTransfer,
  BushaTrends,
  BushaVerification,
  CreateIndividualCustomerPayload,
  CreateQuotePayload,
  CreateRecipientPayload,
  CreateTransferPayload,
  TrendsQuery,
  VerifyCustomerPayload,
} from "./types";

const LIVE_TIMEOUT_MS = 15_000;

export function resolveMode(headerValue?: string | null): BushaMode {
  const v = (headerValue ?? process.env.BUSHA_API_MODE ?? "MOCK").toUpperCase();
  return v === "LIVE" ? "LIVE" : "MOCK";
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Override the client's profile (e.g. customer creation uses none). */
  profileId?: string | null;
}

export class BushaClient {
  readonly mode: BushaMode;
  readonly profileId: string | null;

  constructor(opts: { mode: BushaMode; profileId?: string | null }) {
    this.mode = opts.mode;
    this.profileId = opts.profileId ?? null;
  }

  /** Returns a client bound to a specific Busha customer profile. */
  forProfile(profileId: string): BushaClient {
    return new BushaClient({ mode: this.mode, profileId });
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  private async request<T>(method: "GET" | "POST", path: string, opts: RequestOptions = {}): Promise<T> {
    const profileId = opts.profileId === undefined ? this.profileId : opts.profileId;
    const query = Object.fromEntries(
      Object.entries(opts.query ?? {}).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>;
    const qs = new URLSearchParams(query).toString();
    const fullPath = qs ? `${path}?${qs}` : path;

    const requestId = randomUUID();
    const headers: Record<string, string> = {
      Authorization: "Bearer ••••••••",
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    };
    if (profileId) headers["X-BU-PROFILE-ID"] = profileId;

    const started = Date.now();
    let status = 0;
    let responseBody: unknown;

    try {
      if (this.mode === "MOCK") {
        const res = await handleMockRequest({ method, path, query, body: opts.body, profileId: profileId ?? undefined });
        status = res.status;
        responseBody = res.body;
      } else {
        const token = process.env.BUSHA_BEARER_TOKEN;
        if (!token) {
          throw new DuroError("BUSHA_NOT_CONFIGURED", "BUSHA_BEARER_TOKEN is not set; LIVE mode unavailable", 503);
        }
        const baseUrl = (process.env.BUSHA_BASE_URL || "https://api.sandbox.busha.so").replace(/\/$/, "");
        const res = await fetch(`${baseUrl}${fullPath}`, {
          method,
          headers: { ...headers, Authorization: `Bearer ${token}` },
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
          cache: "no-store",
        });
        status = res.status;
        const text = await res.text();
        try {
          responseBody = text ? JSON.parse(text) : null;
        } catch {
          responseBody = { raw: text };
        }
      }
    } catch (err) {
      if (err instanceof DuroError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      await logApi({
        direction: "OUTGOING", mode: this.mode, method, path: fullPath, status: 0,
        durationMs: Date.now() - started, profileId, requestHeaders: headers,
        requestBody: opts.body, responseBody: { error: message },
      });
      throw new DuroError("BUSHA_UPSTREAM", `Busha request failed: ${message}`, 502);
    }

    await logApi({
      direction: "OUTGOING", mode: this.mode, method, path: fullPath, status,
      durationMs: Date.now() - started, profileId, requestHeaders: headers,
      requestBody: opts.body, responseBody,
    });

    if (status < 200 || status >= 300) {
      const errBody = responseBody as Partial<BushaErrorBody> & { message?: string };
      throw new BushaApiError(
        status,
        errBody?.error?.name ?? "upstream_error",
        errBody?.error?.message ?? errBody?.message ?? `HTTP ${status}`,
        responseBody,
      );
    }
    return (responseBody as BushaSuccess<T>).data;
  }

  private requireProfile(): string {
    if (!this.profileId) throw new Error("BushaClient: profileId is required for this call");
    return this.profileId;
  }

  // -------------------------------------------------------------------------
  // Customers / KYC
  // -------------------------------------------------------------------------

  createIndividualCustomer(payload: Omit<CreateIndividualCustomerPayload, "type" | "country" | "has_accepted_terms">) {
    return this.request<BushaCustomer>("POST", "/v1/customers", {
      profileId: null,
      body: { type: "individual", country: "NG", has_accepted_terms: true, ...payload },
    });
  }

  verifyCustomerIdentity(customerId: string, payload: Omit<VerifyCustomerPayload, "country" | "document_type">) {
    return this.request<BushaVerification>("POST", `/v1/customers/${encodeURIComponent(customerId)}/verify`, {
      profileId: customerId,
      body: { country: "NG", document_type: "nin", ...payload },
    });
  }

  // -------------------------------------------------------------------------
  // Wallet
  // -------------------------------------------------------------------------

  getBalances() {
    this.requireProfile();
    return this.request<BushaBalance[]>("GET", "/v1/balances");
  }

  createQuote(payload: CreateQuotePayload) {
    this.requireProfile();
    return this.request<BushaQuote>("POST", "/v1/quotes", { body: payload });
  }

  createTransfer(payload: CreateTransferPayload) {
    this.requireProfile();
    return this.request<BushaTransfer>("POST", "/v1/transfers", { body: payload });
  }

  getTransfer(transferId: string) {
    this.requireProfile();
    return this.request<BushaTransfer>("GET", `/v1/transfers/${encodeURIComponent(transferId)}`);
  }

  createRecipient(payload: Omit<CreateRecipientPayload, "type" | "currency" | "country">) {
    this.requireProfile();
    return this.request<BushaRecipient>("POST", "/v1/recipients", {
      body: { type: "nigerian_bank_account", currency: "NGN", country: "NG", ...payload },
    });
  }

  // -------------------------------------------------------------------------
  // Insights & Pledges
  // -------------------------------------------------------------------------

  getTransactionTrends(query: TrendsQuery = {}) {
    this.requireProfile();
    return this.request<BushaTrends>("GET", "/v1/insights/transactions/trends", {
      query: { currency: query.currency ?? "NGN", from: query.from, to: query.to, interval: query.interval },
    });
  }

  /** Quote -> create -> activate. Locks USDC collateral, credits cNGN advance. */
  async createAndActivatePledge({ collateralUsdc, advanceNgn }: { collateralUsdc: number; advanceNgn: number }) {
    this.requireProfile();
    const quote = await this.request<BushaPledgeQuote>("POST", "/v1/pledges/quotes", {
      body: {
        collateral_currency: "USDC",
        collateral_amount: fromMinor(toMinor(collateralUsdc)),
        loan_currency: "cNGN",
        loan_amount: fromMinor(toMinor(advanceNgn)),
      },
    });
    const pledge = await this.request<BushaPledge>("POST", "/v1/pledges", { body: { quote_id: quote.id } });
    const activated = await this.request<BushaPledge>(
      "POST",
      `/v1/pledges/${encodeURIComponent(pledge.id)}/activate`,
      { body: {} },
    );
    return { quote, pledge: activated };
  }
}
