export const dynamic = "force-dynamic";

import { getEmployees, deleteEmployee } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import HrClient from "./HrClient";

export default async function HRPage() {
  const [result, currentUser] = await Promise.all([
    getEmployees(),
    getCurrentUser()
  ]);

  const allEmployees = ((result as any)?.data?.data || (result as any)?.data || []) as any[];

  const canEdit = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit)
  );

  const canDelete = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete)
  );

  return (
    <HrClient
      allEmployees={allEmployees}
      canEdit={canEdit}
      canDelete={canDelete}
      deleteEmployeeAction={deleteEmployee}
    />
  );
}
