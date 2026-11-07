import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "duro_session";

const PUBLIC_API_PREFIXES = [
  "/api/onboarding",
  "/api/auth/logout",
  "/api/webhooks/busha",
];

const PROTECTED_PAGE_PREFIXES = [
  "/fund",
  "/send",
  "/credit",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieUserId = request.cookies.get(SESSION_COOKIE)?.value?.trim() || null;
  const headerUserId = request.headers.get("x-duro-user-id")?.trim() || null;
  const userId = headerUserId || cookieUserId;

  // 1. API route protection & session header injection
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );
    if (isPublicApi) {
      return NextResponse.next();
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_ONBOARDED",
            message: "Authentication required. Please sign in or onboard.",
          },
        },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-duro-user-id", userId);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Protected app pages (/fund, /send, /credit, /settings) -> redirect unauthenticated visitors to /
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtectedPage && !cookieUserId) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
