export const dynamic = "force-dynamic";

import { getUnifiedReportsData } from "@/domains/reports/actions/reports.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import ReportsDashboard from "./reports-dashboard";

export default async function ReportsPage() {
  try {
    const user = await getCurrentUser().catch(() => null);
    
    let branchData = null;
    let unifiedData = {
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

    if (user) {
      const [unifiedRes, branchRes] = await Promise.all([
        getUnifiedReportsData().catch((e) => {
          console.error("[ReportsPage] getUnifiedReportsData error:", e);
          return null;
        }),
        getActiveBranchData(user).catch((e) => {
          console.error("[ReportsPage] getActiveBranchData error:", e);
          return null;
        })
      ]);

      branchData = (branchRes as any)?.branchData || null;
      if (unifiedRes?.data) {
        unifiedData = { ...unifiedData, ...unifiedRes.data };
      }
    }

    const branding = {
      name: branchData?.branchName || user?.school?.name || "Edut Pro",
      logoPath: branchData?.logoPath || user?.school?.logoPath || null,
      level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
    };

    return <ReportsDashboard unifiedData={unifiedData} branding={branding} currentUser={user} />;
  } catch (error) {
    console.error("[ReportsPage] Critical error:", error);
    return (
      <ReportsDashboard
        unifiedData={{
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
        }}
        branding={{ name: "Edut Pro", logoPath: null, level: "Gestion Scolaire" }}
        currentUser={null}
      />
    );
  }
}
