export const dynamic = "force-dynamic";

import { getUnifiedReportsData } from "@/domains/reports/actions/reports.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import ReportsDashboard from "./reports-dashboard";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const [unifiedRes, branchRes] = await Promise.all([
    getUnifiedReportsData(),
    getActiveBranchData(user)
  ]);
  const branchData = (branchRes as any)?.branchData || null;

  const unifiedData = (unifiedRes as any)?.data || {
    students: [],
    classes: [],
    subjects: [],
    employees: [],
    feePayments: [],
    expenses: [],
    attendance: [],
    seances: [],
    plans: [],
    resources: [],
    courses: [],
    lessons: [],
    assignments: [],
    submissions: [],
    progress: [],
    virtualClasses: [],
    auditLogs: [],
    grades: [],
    sessions: [],
    periods: []
  };

  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  return <ReportsDashboard unifiedData={unifiedData} branding={branding} currentUser={user} />;
}
