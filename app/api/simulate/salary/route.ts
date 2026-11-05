import { z } from "zod";
import { simulateInboundBankTransfer } from "@/lib/busha/mock-store";
import { buildWebhookEvent, signWebhook } from "@/lib/busha/webhook";
import type { BushaTransfer } from "@/lib/busha/types";
import { getContext } from "@/lib/context";
import { DEMO_SALARY_NGN } from "@/lib/demo";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody, type ApiResponse } from "@/lib/http";
import { fromMinor, toMinor } from "@/lib/money";
import { logApi } from "@/lib/telemetry";
import { getOrCreateFundingAccount } from "@/lib/services/funding";
import { intakeWebhook, type WebhookIntakeResult } from "@/lib/services/webhook-intake";

const Body = z.object({
  amountNgn: z.number().min(100).max(10_000_000).default(DEMO_SALARY_NGN),
  source: z.enum(["EMPLOYER", "POS_AGENT"]).default("EMPLOYER"),
  payerName: z.string().default("Konga Logistics Ltd (Payroll)"),
});

/**
 * Judge chaos trigger: "Simulate Employer Salary Inflow".
 *  1. ensures a temporary virtual account exists (POST /v1/quotes + /v1/transfers)
 *  2. MOCK: the employer's bank pays into it (sandbox credits cNGN)
 *  3. fires a real HMAC-signed `transfer.funds_received` webhook at /api/webhooks/busha
 *     which records the credit and auto-splits autoSavePercent into USDC.
 */
export const POST = handler(async (req) => {
  const ctx = await getContext(req, { requireDevice: false });
  const body = await parseBody(req, Body);
  const { busha, user, mode } = ctx;

  const account = await getOrCreateFundingAccount(busha, user, body.amountNgn, body.source);

  let transfer: BushaTransfer;
  if (mode === "MOCK") {
    transfer = await simulateInboundBankTransfer(user.bushaProfileId, account.transferId, body.amountNgn);
    await logApi({
      direction: "SIMULATOR", mode, method: "NIP", path: `inflow -> ${account.virtualAccount.bankName} ${account.virtualAccount.accountNumber}`,
      status: 200, profileId: user.bushaProfileId,
      requestBody: { payer: body.payerName, amount: fromMinor(toMinor(body.amountNgn)), currency: "NGN" },
      responseBody: { transfer_id: transfer.id, status: transfer.status },
      note: `${body.payerName} paid ₦${body.amountNgn.toLocaleString("en-NG")} into Tunde's virtual account`,
    });
  } else {
    // LIVE: the sandbox can't receive a real NIP transfer from us, so we replay
    // the webhook Busha would send for this transfer.
    const live = await busha.getTransfer(account.transferId);
    const amt = fromMinor(toMinor(body.amountNgn));
    transfer = { ...live, status: "funds_received", source_amount: amt, target_amount: amt };
  }

  const event = buildWebhookEvent("transfer.funds_received", transfer);
  const raw = JSON.stringify(event);
  const signature = signWebhook(raw);

  let intake: WebhookIntakeResult;
  try {
    const res = await fetch(new URL("/api/webhooks/busha", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bu-signature": signature, "x-busha-mode": mode },
      body: raw,
      cache: "no-store",
    });
    const json = (await res.json()) as ApiResponse<WebhookIntakeResult>;
    if (!json.ok) throw new DuroError("INTERNAL", `Webhook rejected: ${json.error.message}`, 500, json.error);
    intake = json.data;
  } catch (err) {
    if (err instanceof DuroError) throw err;
    // Self-fetch unavailable (e.g. deployment protection) -> process in-process, same code path.
    intake = await intakeWebhook(raw, signature, mode);
  }

  return ok({
    virtualAccount: account.virtualAccount,
    transferId: account.transferId,
    reusedVirtualAccount: account.reused,
    webhook: { signature: `${signature.slice(0, 16)}…`, ...intake },
    credited: intake.result?.credited ?? 0,
    autoSaved: intake.result?.autoSave ?? null,
  });
});
