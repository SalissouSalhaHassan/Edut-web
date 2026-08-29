import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MAIN_DOMAIN = "edut.pro";

// Public path prefixes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/register-school",
  "/forgot-password",
  "/verify",
  "/admissions",
  "/auth",
];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const isLocalhost = host.includes("localhost");
  const parts = host.split(".");

  // 1. Detect subdomain or custom domain for Multi-Tenancy
  let subdomain = "";
  let isCustomDomain = false;

  if (isLocalhost) {
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

  // 2. Handle CORS preflight for local or cross-subdomain requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get("origin");
    if (origin && (origin.includes("localhost:3000") || origin.includes(".localhost:3000") || origin.endsWith(MAIN_DOMAIN))) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-school-slug, x-client-info, apikey"
      );
    }
    return response;
  }

  // 3. Initialize Supabase SSR response with cookie management
  let response = NextResponse.next({ request });

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
            if (isLocalhost) {
              delete cookieOptions.domain;
            }
            request.cookies.set(name, value);
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // 4. Verify custom domain slug if applicable
  let schoolSlug = subdomain;
  if (isCustomDomain && !isLocalhost) {
    try {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("slug")
        .eq("custom_domain", host)
        .single();

      if (schoolData?.slug) {
        schoolSlug = schoolData.slug;
      }
    } catch {
      // Fallback silently if lookup fails
    }
  }

  if (schoolSlug) {
    response.headers.set("x-school-slug", schoolSlug);
  }

  // 5. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/platform-admin");

  // 6. Handle Subdomain root redirect for unauthenticated visitors
  if (schoolSlug && !user && pathname === "/") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 7. Route Protection Logic
  // Unauthenticated user trying to access protected dashboard routes
  if (!user && isDashboardRoute) {
    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") {
      redirectUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated user trying to access login/register pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const targetPath = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";
    const dashboardUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 8. Handle Subdomain internal URL rewriting if necessary
  if (schoolSlug) {
    const rewriteUrl = new URL(pathname, request.url);

    if (isLocalhost) {
      rewriteUrl.host = host.includes(":") ? `localhost:${host.split(":")[1]}` : "localhost:3000";
    } else if (!host.endsWith(MAIN_DOMAIN)) {
      rewriteUrl.host = MAIN_DOMAIN;
    }

    if (rewriteUrl.host !== host) {
      const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: new Headers(request.headers),
        },
      });

      rewriteResponse.headers.set("x-school-slug", schoolSlug);
      response.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });

      return rewriteResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they handle their own bearer authentication & tokens)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, manifest.json, and static media files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
