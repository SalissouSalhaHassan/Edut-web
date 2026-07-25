export const dynamic = "force-dynamic";

import { getCurrentSchool } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import SubscriptionClient from "./subscription-client";

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Primary: get school by subdomain slug
  // Fallback: use school embedded in user session (works on main domain)
  let school = await getCurrentSchool();
  if (!school && user?.school) {
    school = user.school as any;
  }
  
  return <SubscriptionClient initialSchool={school} user={user} />;
}
