import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-cookie";
import { isSuperAdmin } from "@/lib/admin";
import {
  evaluateWorkspaceAccess,
  getWorkspaceSubscription,
} from "@/lib/subscriptions";

export async function middleware(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (!user && !isAuthRoute && pathname.startsWith("/app")) {
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

  if (
    user &&
    pathname.startsWith("/app") &&
    !pathname.startsWith("/app/billing-blocked") &&
    !pathname.startsWith("/app/admin")
  ) {
    const wsId = request.cookies.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (wsId) {
      try {
        const admin = await isSuperAdmin(supabase, user);
        const sub = await getWorkspaceSubscription(supabase, wsId);
        const access = evaluateWorkspaceAccess(sub, { bypass: admin });
        if (!access.ok) {
          const url = request.nextUrl.clone();
          url.pathname = "/app/billing-blocked";
          url.searchParams.set("reason", access.reason);
          return NextResponse.redirect(url);
        }
      } catch {
        /* tabelas antigas / rede: não bloquear */
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
