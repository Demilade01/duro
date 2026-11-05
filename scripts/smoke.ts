/**
 * End-to-end smoke test for the Duro backend (MOCK mode).
 * Usage:  npm run dev   (in another terminal)
 *         npm run smoke [-- http://localhost:3000]
 */
import { config } from "dotenv";
import { createHmac, randomUUID } from "node:crypto";

config({ path: ".env.local" });
config();

const BASE = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const TRUSTED = "DEV_TUNDE_IPHONE_01";
const HACKER = "DEV_HACKER_99";
const SELFIE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let passed = 0;
let failed = 0;

async function call(method: string, path: string, opts: { body?: unknown; device?: string | null; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-busha-mode": "MOCK", ...opts.headers };
  if (opts.device !== null) headers["x-device-id"] = opts.device ?? TRUSTED;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
  const json = (await res.json()) as Json;
  return { status: res.status, json };
}

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.log(`  \u2717 ${name}`);
    if (detail !== undefined) console.log("    ", JSON.stringify(detail, null, 2).slice(0, 1500));
  }
}

const near = (a: number, b: number, eps = 0.011) => Math.abs(a - b) < eps;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Duro smoke test -> ${BASE}\n`);

  console.log("1. Onboarding");
  const onb = await call("POST", "/api/onboarding", { body: { reset: true } });
  check("creates Tunde (201)", onb.status === 201 && onb.json.data.created === true, onb.json);
  check("Busha customer id BUS_tunde99887766", onb.json.data?.bushaCustomer?.id === "BUS_tunde99887766", onb.json.data?.bushaCustomer);
  check("Mama is a pre-verified recipient", onb.json.data?.recipients?.[0]?.isPreVerified === true);
  const mamaId: string = onb.json.data?.recipients?.[0]?.id;
  const again = await call("POST", "/api/onboarding", { body: {} });
  check("onboarding is idempotent", again.status === 200 && again.json.data.created === false, again.json);

  console.log("\n2. Wallet & funding");
  const noDevice = await call("GET", "/api/wallet", { device: null });
  check("missing x-device-id -> 400", noDevice.status === 400 && noDevice.json.error.code === "DEVICE_ID_REQUIRED", noDevice.json);
  const w0 = await call("GET", "/api/wallet");
  check("wallet starts at zero", w0.json.data?.balances?.spend.available === 0 && w0.json.data?.balances?.save.available === 0, w0.json);
  check("lock inactive", w0.json.data?.lock.active === false);
  const fund = await call("POST", "/api/fund", { body: { amountNgn: 150000, source: "EMPLOYER" } });
  check("virtual account generated", fund.status === 201 && fund.json.data.virtualAccount.accountNumber === "9981234567", fund.json);

  console.log("\n3. Salary inflow webhook + auto-split");
  const sal = await call("POST", "/api/simulate/salary", { body: { amountNgn: 150000 }, device: null });
  check("salary simulated", sal.status === 200, sal.json);
  check("re-used the pending virtual account", sal.json.data?.reusedVirtualAccount === true, sal.json.data);
  check("credited ₦150,000", sal.json.data?.credited === 150000, sal.json.data);
  check("auto-saved ₦22,500 -> $14.12", sal.json.data?.autoSaved?.ngn === 22500 && near(sal.json.data?.autoSaved?.usdc, 14.12), sal.json.data?.autoSaved);
  const w1 = await call("GET", "/api/wallet");
  check("Spend = ₦127,500", w1.json.data?.balances?.spend.available === 127500, w1.json.data?.balances);
  check("Save = $14.12", near(w1.json.data?.balances?.save.available, 14.12), w1.json.data?.balances);

  console.log("\n4. Webhook security");
  const bad = await call("POST", "/api/webhooks/busha", { body: { id: "EVT_x", event: "transfer.funds_received", data: {} }, device: null, headers: { "x-bu-signature": "deadbeef" } });
  check("bad signature -> 401", bad.status === 401 && bad.json.error.code === "INVALID_SIGNATURE", bad.json);
  if (process.env.BUSHA_WEBHOOK_SECRET) {
    const raw = JSON.stringify({ id: `EVT_${randomUUID()}`, event: "transfer.status_updated", created_at: new Date().toISOString(), data: { id: "TRF_NOPE", profile_id: "BUS_tunde99887766", status: "processing" } });
    const sig = createHmac("sha256", process.env.BUSHA_WEBHOOK_SECRET).update(raw).digest("hex");
    const first = await call("POST", "/api/webhooks/busha", { body: raw, device: null, headers: { "x-bu-signature": sig } });
    const dup = await call("POST", "/api/webhooks/busha", { body: raw, device: null, headers: { "x-bu-signature": `sha256=${sig}` } });
    check("valid signature accepted", first.status === 200 && first.json.data.duplicate === false, first.json);
    check("replayed event is deduplicated", dup.status === 200 && dup.json.data.duplicate === true, dup.json);
  }

  console.log("\n5. Remittance to Mama (live timeline)");
  const rem = await call("POST", "/api/remit", { body: { recipientId: mamaId, amountNgn: 20000 } });
  check("payout created", rem.status === 201 && rem.json.data.transfer.status === "pending", rem.json);
  const trfId: string = rem.json.data?.transfer?.id;
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const p = await call("GET", `/api/remit?transferId=${trfId}`);
    seen.add(p.json.data?.transfer?.status);
    if (p.json.data?.transfer?.status === "funds_delivered") break;
    await sleep(700);
  }
  check("walked pending -> processing -> outgoing_payment_sent -> funds_delivered", ["pending", "processing", "outgoing_payment_sent", "funds_delivered"].every((s) => seen.has(s)), [...seen]);
  const conv = await call("POST", "/api/split", { body: { action: "MOVE", direction: "SAVE_TO_SPEND", amount: 1 } });
  check("Save -> Spend allowed while unlocked", conv.status === 200, conv.json);
  const pct = await call("POST", "/api/split", { body: { action: "SET_PERCENT", percent: 20 } });
  check("auto-save % updated", pct.json.data?.profile?.autoSavePercent === 20, pct.json);
  await call("POST", "/api/split", { body: { action: "SET_PERCENT", percent: 15 } });

  console.log("\n6. SIM-swap attack");
  const atk = await call("POST", "/api/security/sim-swap", { body: { action: "SIMULATE_ATTACK" }, device: null });
  check("lock engaged for 24h", atk.json.data?.lock?.active === true && atk.json.data?.deviceId === HACKER, atk.json);
  const drain = await call("POST", "/api/split", { body: { action: "MOVE", direction: "SAVE_TO_SPEND", amount: 5 }, device: HACKER });
  check("USDC drain blocked (423)", drain.status === 423 && drain.json.error.code === "VELOCITY_LOCKED", drain.json);
  const thief = await call("POST", "/api/remit", { device: HACKER, body: { amountNgn: 100000, newRecipient: { label: "Fraudster", bankName: "Opay", bankCode: "999992", accountNumber: "8012345678", accountName: "JOHN DOE" } } });
  check("payout to new recipient blocked (423)", thief.status === 423 && thief.json.error.code === "UNVERIFIED_RECIPIENT_LOCKED", thief.json);
  const pledgeLocked = await call("POST", "/api/passport", { device: HACKER, body: { advanceNgn: 5000 } });
  check("pledge against Save blocked (423)", pledgeLocked.status === 423, pledgeLocked.json);
  const famOk = await call("POST", "/api/remit", { device: HACKER, body: { recipientId: mamaId, amountNgn: 5000 } });
  check("payout to pre-verified Mama still allowed", famOk.status === 201, famOk.json);

  console.log("\n7. Liveness recovery");
  const wrong = await call("POST", "/api/security/sim-swap", { device: HACKER, body: { action: "RECOVER_IDENTITY", nin: "00000000000", selfieImage: SELFIE } });
  check("wrong NIN rejected (403)", wrong.status === 403 && wrong.json.error.code === "KYC_FAILED", wrong.json);
  const rec = await call("POST", "/api/security/sim-swap", { device: HACKER, body: { action: "RECOVER_IDENTITY", nin: "12345678901", selfieImage: SELFIE } });
  check("lock cleared and new device trusted", rec.status === 200 && rec.json.data.lock.active === false && rec.json.data.lock.deviceTrusted === true, rec.json);
  const after = await call("POST", "/api/split", { device: HACKER, body: { action: "MOVE", direction: "SAVE_TO_SPEND", amount: 1 } });
  check("Save -> Spend works again", after.status === 200, after.json);

  console.log("\n8. Financial passport & rent advance");
  const noConsent = await call("GET", "/api/passport", { device: HACKER });
  check("statement requires consent (403)", noConsent.status === 403 && noConsent.json.error.code === "CONSENT_REQUIRED", noConsent.json);
  const stmt = await call("GET", "/api/passport?consent=true", { device: HACKER });
  check("statement has inflow history", stmt.status === 200 && stmt.json.data.statement.summary.totalInflow > 150000, stmt.json.data?.statement?.summary);
  check("credit offer eligible", stmt.json.data?.creditOffer?.eligible === true, stmt.json.data?.creditOffer);
  const pledge = await call("POST", "/api/passport", { device: HACKER, body: { advanceNgn: 5000 } });
  check("pledge authorized (PLG_)", pledge.status === 201 && pledge.json.data.pledge.status === "authorized" && pledge.json.data.pledge.id.startsWith("PLG_"), pledge.json);
  check("collateral $4.71 locked, not sold", near(pledge.json.data?.collateralUsdc, 4.71) && near(pledge.json.data?.balances?.save.locked, 4.71), pledge.json.data);

  const final = await call("GET", "/api/wallet", { device: HACKER });
  // 127,500 - 20,000 + 1,593 - 5,000 + 1,593 + 5,000
  check("final Spend = ₦110,686", near(final.json.data?.balances?.spend.available, 110686), final.json.data?.balances?.spend);
  check("final Save total = $12.12 (7.41 free + 4.71 pledged)", near(final.json.data?.balances?.save.total, 12.12), final.json.data?.balances?.save);
  check("telemetry logs present", (final.json.data?.logs?.length ?? 0) > 10);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
