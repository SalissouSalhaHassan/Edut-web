import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const isLocalhost = host.includes("localhost");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gkarotahjtyvmhjqejts.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYXJvdGFoanR5dm1oanFlanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDQyMTYsImV4cCI6MjA5MDE4MDIxNn0.wtLB6lMFV3nWx-KUMVNoLszSjGfA7-Kttmzvw_xZy9Q";

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options };
              // On localhost, let the browser handle the domain automatically
              if (isLocalhost) {
                delete cookieOptions.domain;
              }
              cookieStore.set(name, value, cookieOptions);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
