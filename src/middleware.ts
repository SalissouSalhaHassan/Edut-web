import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";
  
  // Detect subdomain or custom domain
  const isLocalhost = host.includes("localhost");
  const parts = host.split(".");
  let subdomain = "";
  let isCustomDomain = false;

  const MAIN_DOMAIN = "edut.pro";

  if (isLocalhost) {
    // Check if we have a subdomain on localhost (e.g., edutpro.localhost:3000)
    if (parts.length >= 2 && parts[parts.length - 1].includes("localhost")) {
      // If it's something.localhost:3000 or something.localhost
      if (parts[0] !== "localhost" && parts[0] !== "www") {
        subdomain = parts[0];
      }
    }
  } else if (host.endsWith(MAIN_DOMAIN)) {
    // Check for subdomain of edut.pro
    if (parts.length >= 3 && parts[0] !== "www") {
      subdomain = parts[0];
    }
  } else {
    // Potential custom domain
    isCustomDomain = true;
  }

  let supabaseResponse = NextResponse.next({ request });

  // ... supabase client setup ...
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options };
            if (isLocalhost) {
              delete cookieOptions.domain;
            }
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // If it's a potential custom domain, verify it
  let schoolSlug = subdomain;
  if (isCustomDomain && !isLocalhost) {
    // In a real app, we'd cache this lookup
    const { data: schoolData } = await supabase
      .from("schools")
      .select("slug")
      .eq("custom_domain", host)
      .single();
    
    if (schoolData) {
      schoolSlug = schoolData.slug;
    } else {
      // If no school found for this domain, maybe redirect to main site or error
      // For now, we'll just continue
    }
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Handle Subdomain/Domain Routing
  if (schoolSlug && !user && request.nextUrl.pathname === "/") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Rewrite logic for subdomains to prevent 404s and handle multi-tenancy
  if (schoolSlug) {
    const rewriteUrl = new URL(request.nextUrl.pathname, request.url);
    
    // In development, rewrite to localhost:3000 to ensure Next.js resolves routes correctly
    // In production, rewrite to the main domain
    if (isLocalhost) {
      rewriteUrl.host = host.includes(":") ? `localhost:${host.split(":")[1]}` : "localhost:3000";
    } else if (!host.endsWith(MAIN_DOMAIN)) {
      // If it's a custom domain, we also rewrite to the main domain internally
      rewriteUrl.host = MAIN_DOMAIN;
    }

    // Only rewrite if the host is actually different to avoid infinite loops or unnecessary overhead
    if (rewriteUrl.host !== host) {
      console.log(`[Middleware] Rewriting ${host}${request.nextUrl.pathname} to ${rewriteUrl.host}${rewriteUrl.pathname}`);
      
      // Create a new response with the rewrite
      const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: new Headers(request.headers),
        },
      });

      // Set the school slug header so the app can identify the tenant
      rewriteResponse.headers.set("x-school-slug", schoolSlug);
      
      // Copy all cookies from the supabaseResponse to the new rewriteResponse
      supabaseResponse.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });

      // Also set CORS headers on the rewriteResponse if on localhost
      if (isLocalhost) {
        const origin = request.headers.get("origin");
        if (origin && (origin.includes("localhost:3000") || origin.includes(".localhost:3000"))) {
          rewriteResponse.headers.set("Access-Control-Allow-Origin", origin);
          rewriteResponse.headers.set("Access-Control-Allow-Credentials", "true");
          rewriteResponse.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
          rewriteResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-school-slug");
        }
      }

      // Handle Auth Protection for the rewritten request
      if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }

      if (user && request.nextUrl.pathname === "/login") {
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
      }

      return rewriteResponse;
    }
  }

  if (schoolSlug) {
    supabaseResponse.headers.set("x-school-slug", schoolSlug);
  }

  // CORS Headers for localhost subdomains
  if (isLocalhost) {
    const origin = request.headers.get("origin");
    if (origin && (origin.includes("localhost:3000") || origin.includes(".localhost:3000"))) {
      supabaseResponse.headers.set("Access-Control-Allow-Origin", origin);
      supabaseResponse.headers.set("Access-Control-Allow-Credentials", "true");
      supabaseResponse.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      supabaseResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-school-slug");
    }
  }

  // Auth Protection Logic
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Handle OPTIONS request for CORS preflight
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
