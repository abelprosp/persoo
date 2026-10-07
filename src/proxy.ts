import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      !pathname.startsWith("/api/forms/") && !pathname.startsWith("/api/webhooks/") && pathname !== "/api/stripe/webhook") {
    const origin = request.headers.get("origin");
    const allowed = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
    if ((origin && origin !== allowed && !(process.env.NODE_ENV !== "production" && origin === request.nextUrl.origin)) || request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }
  }

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (!user && !isAuthRoute && (pathname.startsWith("/app") || isOnboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
