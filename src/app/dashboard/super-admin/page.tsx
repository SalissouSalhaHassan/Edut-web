export const dynamic = "force-dynamic";

import { getAllSchools, getPlatformStats } from "@/domains/auth/actions/super-admin.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { redirect } from "next/navigation";
import SuperAdminClient from "./super-admin-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuperAdminDashboard() {
  const user = await getCurrentUser();
  const isSuperAdmin = Boolean(user?.superAdmin === true || user?.superAdmin === 1);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  const platformStatsResponse = await getPlatformStats();
  const stats =
    platformStatsResponse.data?.stats ?? {
      totalSchools: 0,
      totalStudents: 0,
      activeSchools: 0,
      revenue: 0,
    };

  const schoolsResponse = await getAllSchools();
  const schoolsList = schoolsResponse.data?.data ?? [];

  return (
    <SuperAdminClient 
      initialSchools={schoolsList} 
      stats={stats} 
      user={user} 
    />
  );
}
