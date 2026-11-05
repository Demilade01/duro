import { getContext } from "@/lib/context";
import { handler, ok } from "@/lib/http";
import { buildWalletSnapshot } from "@/lib/services/wallet";

export const GET = handler(async (req) => {
  const ctx = await getContext(req);
  return ok(await buildWalletSnapshot(ctx));
});
