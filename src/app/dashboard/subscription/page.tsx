import { getCurrentSchool } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import SubscriptionClient from "./subscription-client";

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const school = await getCurrentSchool();
  
  return <SubscriptionClient initialSchool={school} user={user} />;
}
