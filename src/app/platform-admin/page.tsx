export const dynamic = "force-dynamic";

import {
  getGlobalPlatformStats,
  getAllSchools,
  getGlobalAuditLogs
} from "@/domains/platform/actions/platform.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { PlatformAdminClient } from "./components/PlatformAdminClient";

export default async function PlatformAdminPage() {
  const [statsRes, schoolsRes, logsRes, currentUser] = await Promise.all([
    getGlobalPlatformStats(),
    getAllSchools(),
    getGlobalAuditLogs(),
    getCurrentUser(),
  ]);

  const stats = statsRes.success
    ? statsRes.data || { schools: 0, students: 0, users: 0, revenue: 0 }
    : { schools: 0, students: 0, users: 0, revenue: 0 };
  const schoolsList = schoolsRes.success ? schoolsRes.data || [] : [];
  const logs = logsRes.success ? logsRes.data || [] : [];

  const userName = currentUser?.nomPrenom || currentUser?.utilisateur || "Super Admin";

  return (
    <PlatformAdminClient
      stats={stats}
      schoolsList={schoolsList}
      logs={logs}
      userName={userName}
    />
  );
}
