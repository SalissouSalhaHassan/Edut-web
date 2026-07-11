import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { eq, or } from "drizzle-orm";

import { readDb } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { getUserRoleType, hasPermission, type PermissionAction } from "@/domains/auth/services/rbac";

export function mobileJsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  };
}

export async function getMobileUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return { user: null, response: mobileJsonError("Token mobile manquant.", 401) };
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    return { user: null, response: mobileJsonError("Configuration Supabase indisponible.", 500) };
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, response: mobileJsonError("Session mobile invalide.", 401) };
  }

  const email = data.user.email?.toLowerCase().trim() || "";
  const username = email.includes("@") ? email.split("@")[0] : email;

  const user = await readDb.query.users.findFirst({
    where: or(
      eq(users.supabaseId, data.user.id),
      email ? eq(users.utilisateur, email) : undefined,
      username ? eq(users.utilisateur, username) : undefined
    ),
    with: {
      role: {
        with: {
          permissions: true,
        },
      },
      school: true,
    },
  });

  if (!user) {
    return { user: null, response: mobileJsonError("Compte non relie a un profil Edut.", 403) };
  }

  return { user, response: null };
}

export async function canUseMobileModule(
  user: NonNullable<Awaited<ReturnType<typeof getMobileUser>>["user"]>,
  moduleName: string,
  action: PermissionAction
) {
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;
  if (action === "canView") return true;
  if (moduleName.toLowerCase() === "messaging" && (roleType === "teacher" || roleType === "enseignant")) {
    return action !== "canDelete";
  }
  if (["directeur", "general_director", "level_director", "dren", "dden", "inspection"].includes(roleType)) {
    return true;
  }
  return await hasPermission(user.id, moduleName, action);
}
