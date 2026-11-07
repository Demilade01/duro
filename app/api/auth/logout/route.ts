import { SESSION_COOKIE } from "@/lib/context";
import { handler, ok } from "@/lib/http";

export const POST = handler(async () => {
  const res = ok({ loggedOut: true });
  res.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
});
