import { z } from "zod";
import { getContext } from "@/lib/context";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody } from "@/lib/http";
import { USD_NGN_RATE, round2 } from "@/lib/money";
import { enforceVelocityGuard } from "@/lib/security/velocity-guard";
import { recordTx } from "@/lib/services/ledger";
import { publicProfile, summarizeBalances } from "@/lib/services/wallet";

/** Collateral must cover 150% of the advance (LTV ≈ 66.7%). */
const COLLATERAL_RATIO = 1.5;
/** Advance capped at 50% of average monthly inflow. */
const INCOME_ADVANCE_RATIO = 0.5;

const Query = z.object({
  consent: z.enum(["true", "1"], { message: "Explicit consent (consent=true) is required to generate the statement" }),
  from: z.string().optional(),
  to: z.string().optional(),
  interval: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
});

function creditOffer(totalInflow: number, rangeDays: number, usdcAvailable: number) {
  const months = Math.max(1, rangeDays / 30);
  const avgMonthlyInflow = round2(totalInflow / months);
  const maxByIncome = avgMonthlyInflow * INCOME_ADVANCE_RATIO;
  const maxByCollateral = (usdcAvailable * USD_NGN_RATE) / COLLATERAL_RATIO;
  const maxAdvanceNgn = Math.max(0, Math.floor(Math.min(maxByIncome, maxByCollateral) / 100) * 100);
  return {
    eligible: maxAdvanceNgn >= 1000,
    maxAdvanceNgn,
    avgMonthlyInflow,
    collateralRatio: COLLATERAL_RATIO,
    usdcAvailable,
    rate: USD_NGN_RATE,
    limitedBy: maxByIncome <= maxByCollateral ? "INCOME" : "COLLATERAL",
  };
}

/** Consented Landlord Cash-Flow Statement (Busha Insights) + rent-advance offer. */
export const GET = handler(async (req) => {
  const ctx = await getContext(req);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    throw new DuroError("CONSENT_REQUIRED", parsed.error.issues[0]?.message ?? "Consent required", 403);
  }
  const q = parsed.data;

  const [trends, rawBalances] = await Promise.all([
    ctx.busha.getTransactionTrends({ currency: "NGN", from: q.from, to: q.to, interval: q.interval }),
    ctx.busha.getBalances(),
  ]);
  const balances = summarizeBalances(rawBalances);
  const rangeDays = Math.max(1, (Date.parse(trends.to) - Date.parse(trends.from)) / 86_400_000);
  const generatedAt = new Date().toISOString();

  return ok({
    statement: {
      statementId: `DURO-STMT-${Date.now()}`,
      title: "Cash-Flow Statement",
      holder: publicProfile(ctx.user),
      kyc: { status: ctx.user.kycStatus, method: "NIN + liveness selfie", provider: "Busha" },
      consent: { granted: true, grantedAt: generatedAt, scope: "cash_flow_statement" },
      period: { from: trends.from, to: trends.to, interval: trends.interval },
      currency: trends.currency,
      summary: {
        totalInflow: Number(trends.summary.total_inflow),
        totalOutflow: Number(trends.summary.total_outflow),
        netCashFlow: Number(trends.summary.net_cash_flow),
      },
      series: trends.series.map((p) => ({
        date: p.date,
        inflow: Number(p.inflow),
        outflow: Number(p.outflow),
        net: Number(p.net),
      })),
      savings: { usdc: balances.save.total, ngnEquivalent: balances.save.ngnEquivalent },
      generatedAt,
    },
    creditOffer: creditOffer(Number(trends.summary.total_inflow), rangeDays, balances.save.available),
  });
});

const PledgeBody = z.object({
  advanceNgn: z.number().min(1_000).max(2_000_000),
  purpose: z.enum(["RENT", "SCHOOL_FEES", "EMERGENCY"]).default("RENT"),
});

/** Rent micro-advance: pledge USDC as collateral (no sale) and receive cNGN. */
export const POST = handler(async (req) => {
  const ctx = await getContext(req);
  const body = await parseBody(req, PledgeBody);

  await enforceVelocityGuard(
    ctx.user,
    { type: "SAVE_WITHDRAW", description: `Pledge USDC for ₦${body.advanceNgn.toLocaleString("en-NG")} advance` },
    ctx,
  );

  const before = summarizeBalances(await ctx.busha.getBalances());
  const collateralUsdc = Math.ceil(((body.advanceNgn * COLLATERAL_RATIO) / USD_NGN_RATE) * 100) / 100;
  if (collateralUsdc > before.save.available) {
    throw new DuroError(
      "INSUFFICIENT_FUNDS",
      `This advance needs $${collateralUsdc.toFixed(2)} in Save as collateral; you have $${before.save.available.toFixed(2)}.`,
      422,
      { collateralUsdc, usdcAvailable: before.save.available },
    );
  }

  const { quote, pledge } = await ctx.busha.createAndActivatePledge({ collateralUsdc, advanceNgn: body.advanceNgn });

  const transaction = await recordTx({
    userId: ctx.user.id,
    kind: "PLEDGE_ADVANCE",
    direction: "IN",
    currency: "cNGN",
    amount: Number(pledge.loan_amount),
    counterCurrency: "USDC",
    counterAmount: Number(pledge.collateral_amount),
    status: pledge.status,
    description: `${body.purpose === "RENT" ? "Rent" : body.purpose === "SCHOOL_FEES" ? "School fees" : "Emergency"} advance (dollars kept as collateral)`,
    meta: { pledgeId: pledge.id, pledgeQuoteId: quote.id, ltv: pledge.ltv, purpose: body.purpose },
  });

  const balances = summarizeBalances(await ctx.busha.getBalances());
  return ok({ pledge, collateralUsdc, advanceNgn: body.advanceNgn, ltv: Number(pledge.ltv), transaction, balances }, 201);
});
