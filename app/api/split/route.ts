import { eq } from "drizzle-orm";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { handler, ok, parseBody } from "@/lib/http";
import { enforceVelocityGuard } from "@/lib/security/velocity-guard";
import { convertBetweenBalances } from "@/lib/services/conversions";
import { getUserBalances, publicProfile } from "@/lib/services/wallet";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SET_PERCENT"),
    percent: z.number().int().min(0).max(90),
  }),
  z.object({
    action: z.literal("MOVE"),
    direction: z.enum(["SPEND_TO_SAVE", "SAVE_TO_SPEND"]),
    /** Source-currency amount: NGN for SPEND_TO_SAVE, USD for SAVE_TO_SPEND. */
    amount: z.number().positive(),
  }),
]);

export const POST = handler(async (req) => {
  const ctx = await getContext(req);
  const body = await parseBody(req, Body);

  if (body.action === "SET_PERCENT") {
    const [updated] = await getDb()
      .update(userProfiles)
      .set({ autoSavePercent: body.percent })
      .where(eq(userProfiles.id, ctx.user.id))
      .returning();
    return ok({ profile: publicProfile(updated) });
  }

  if (body.direction === "SAVE_TO_SPEND") {
    await enforceVelocityGuard(
      ctx.user,
      { type: "SAVE_WITHDRAW", description: `Convert $${body.amount.toFixed(2)} USDC -> cNGN` },
      ctx,
    );
  }

  const { transfer, transaction } = await convertBetweenBalances(ctx.busha, ctx.user, body.direction, body.amount);
  const balances = await getUserBalances(ctx);
  return ok({ transfer, transaction, balances });
});
