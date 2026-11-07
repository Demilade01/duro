import { z } from "zod";
import { getContext } from "@/lib/context";
import { DEMO_SALARY_NGN } from "@/lib/demo";
import { handler, ok, parseBody } from "@/lib/http";
import { createFundingAccount } from "@/lib/services/funding";

const Body = z.object({
  amountNgn: z.number().min(100).max(10_000_000).default(DEMO_SALARY_NGN),
  source: z.enum(["EMPLOYER", "POS_AGENT"]).default("EMPLOYER"),
});

/** Generates a Busha temporary virtual bank account (NGN -> cNGN pay-in). */
export const POST = handler(async (req) => {
  const ctx = await getContext(req);
  const body = await parseBody(req, Body);
  const { quote, transfer, virtualAccount, transaction } = await createFundingAccount(
    ctx.busha,
    ctx.user,
    body.amountNgn,
    body.source,
  );
  return ok({ quote, transferId: transfer.id, transfer, virtualAccount, transaction }, 201);
});
