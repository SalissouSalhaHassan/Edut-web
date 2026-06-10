import { getCurrentUser } from "@/domains/auth/services/session";

export async function getCurrentEducationalLevel(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.educationalLevel || null;
}

export async function isUserAdminOrManager(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.admin === true;
}