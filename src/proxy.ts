import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  parseAccess,
  serializeAccess,
  type MemberAccess,
} from "@/lib/access-cookie";

// Signed-out only: signed-in members are sent on to the app.
const guestOnlyPaths = ["/login", "/signup", "/forgot-password"];
// Reachable either way: email link handlers and the reset form.
const openPaths = ["/auth", "/reset-password"];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Server-side redirects that run before any page renders, so signed-out or
 * not-yet-onboarded members never see a page flash before being sent away.
 * Also refreshes the Supabase session cookie when it is close to expiring.
 * These are navigation checks only; API routes and database functions still
 * enforce access for every read and write.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Let pages render their own "Supabase is not configured" error.
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Verifies the session (and refreshes it if needed). Don't add code between
  // creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Keep any refreshed session or access cookies set above.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (matchesPath(pathname, openPaths)) return response;

  if (!userId) {
    if (request.cookies.has(ACCESS_COOKIE)) response.cookies.delete(ACCESS_COOKIE);
    if (matchesPath(pathname, guestOnlyPaths)) return response;
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectTo(`/login${next}`);
  }

  const access = await getAccess(request, response, supabase, userId);
  if (!access) return response; // Profile unavailable: let the page show its own error.

  const canUseApp = access.onboarded || access.role === "admin";

  if (matchesPath(pathname, guestOnlyPaths)) {
    return redirectTo(canUseApp ? "/" : "/onboarding");
  }
  if (matchesPath(pathname, ["/onboarding"])) {
    return access.onboarded ? redirectTo("/") : response;
  }
  if (!canUseApp) return redirectTo("/onboarding");
  if (matchesPath(pathname, ["/admin"]) && access.role !== "admin") return redirectTo("/");

  return response;
}

async function getAccess(
  request: NextRequest,
  response: NextResponse,
  supabase: SupabaseClient,
  userId: string,
): Promise<MemberAccess | null> {
  const cached = parseAccess(request.cookies.get(ACCESS_COOKIE)?.value);
  if (cached?.userId === userId) return cached;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_complete, role")
    .eq("id", userId)
    .single<{ onboarding_complete: boolean; role: "member" | "admin" }>();
  if (error || !profile) {
    console.error("Proxy could not load the member's profile:", error);
    return null;
  }

  const access: MemberAccess = {
    userId,
    onboarded: profile.onboarding_complete,
    role: profile.role === "admin" ? "admin" : "member",
  };
  response.cookies.set(ACCESS_COOKIE, serializeAccess(access), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  return access;
}

export const config = {
  matcher: [
    // Everything except API routes (they check auth themselves), Next.js assets, and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
