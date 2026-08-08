/**
 * Next.js Middleware — Edut Platform
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session cookies on every request.
 * 2. Detect subdomain / custom domain and inject `x-school-slug` header
 *    so that `getCurrentSchool()` / `getActiveSchoolId()` work correctly
 *    in Server Actions (this was the root cause of createPeriod failures).
 * 3. Protect /dashboard routes — redirect unauthenticated users to /login.
 * 4. Redirect authenticated users away from /login to /dashboard.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";

  const MAIN_DOMAIN = "edut.pro";
  const isLocalhost = host.includes("localhost");
  const parts = host.split(".");

  let subdomain = "";
  let isCustomDomain = false;

  if (isLocalhost) {
    // e.g.  school1.localhost:3000
    if (parts.length >= 2 && parts[parts.length - 1].includes("localhost")) {
      if (parts[0] !== "localhost" && parts[0] !== "www") {
        subdomain = parts[0];
      }
    }
  } else if (host.endsWith(MAIN_DOMAIN)) {
    if (parts.length >= 3 && parts[0] !== "www") {
      subdomain = parts[0];
    }
  } else {
    isCustomDomain = true;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options };
            if (isLocalhost) delete cookieOptions.domain;
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // Resolve school slug for custom domains
  let schoolSlug = subdomain;
  if (isCustomDomain && !isLocalhost) {
    try {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("slug")
        .eq("custom_domain", host)
        .single();
      if (schoolData) schoolSlug = schoolData.slug;
    } catch {
      // ignore — not a known custom domain
    }
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes
  if (!user && pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Inject school slug header ─────────────────────────────────────────────
  // This is critical: without this header, getCurrentSchool() returns null,
  // getActiveSchoolId() falls back to user.schoolId only, and if there's any
  // mismatch the session-validation inside createPeriod throws an error.
  if (schoolSlug) {
    supabaseResponse.headers.set("x-school-slug", schoolSlug);
  }

  // ── CORS (localhost subdomains only) ──────────────────────────────────────
  if (isLocalhost) {
    const origin = request.headers.get("origin");
    if (origin && (origin.includes("localhost:3000") || origin.includes(".localhost:3000"))) {
      supabaseResponse.headers.set("Access-Control-Allow-Origin", origin);
      supabaseResponse.headers.set("Access-Control-Allow-Credentials", "true");
      supabaseResponse.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      supabaseResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-school-slug");
    }
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get("origin");
    if (origin && (origin.includes("localhost:3000") || origin.includes(".localhost:3000"))) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-school-slug, x-client-info, apikey");
    }
    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
