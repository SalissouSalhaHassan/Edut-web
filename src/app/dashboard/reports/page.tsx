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
        unifiedData = {
          students: Array.isArray(unifiedRes.data.students) ? unifiedRes.data.students : [],
          classes: Array.isArray(unifiedRes.data.classes) ? unifiedRes.data.classes : [],
          subjects: Array.isArray(unifiedRes.data.subjects) ? unifiedRes.data.subjects : [],
          employees: Array.isArray(unifiedRes.data.employees) ? unifiedRes.data.employees : [],
          feePayments: Array.isArray(unifiedRes.data.feePayments) ? unifiedRes.data.feePayments : [],
          expenses: Array.isArray(unifiedRes.data.expenses) ? unifiedRes.data.expenses : [],
          attendance: Array.isArray(unifiedRes.data.attendance) ? unifiedRes.data.attendance : [],
          seances: Array.isArray(unifiedRes.data.seances) ? unifiedRes.data.seances : [],
          plans: Array.isArray(unifiedRes.data.plans) ? unifiedRes.data.plans : [],
          resources: Array.isArray(unifiedRes.data.resources) ? unifiedRes.data.resources : [],
          courses: Array.isArray(unifiedRes.data.courses) ? unifiedRes.data.courses : [],
          lessons: Array.isArray(unifiedRes.data.lessons) ? unifiedRes.data.lessons : [],
          assignments: Array.isArray(unifiedRes.data.assignments) ? unifiedRes.data.assignments : [],
          submissions: Array.isArray(unifiedRes.data.submissions) ? unifiedRes.data.submissions : [],
          progress: Array.isArray(unifiedRes.data.progress) ? unifiedRes.data.progress : [],
          virtualClasses: Array.isArray(unifiedRes.data.virtualClasses) ? unifiedRes.data.virtualClasses : [],
          auditLogs: Array.isArray(unifiedRes.data.auditLogs) ? unifiedRes.data.auditLogs : [],
          grades: Array.isArray(unifiedRes.data.grades) ? unifiedRes.data.grades : [],
          sessions: Array.isArray(unifiedRes.data.sessions) ? unifiedRes.data.sessions : [],
          periods: Array.isArray(unifiedRes.data.periods) ? unifiedRes.data.periods : []
        };
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
