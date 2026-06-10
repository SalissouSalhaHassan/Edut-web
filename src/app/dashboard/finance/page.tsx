import { getStudentFees, getFinanceStats, syncStudentFees } from "@/domains/finance/actions/finance.actions";
import { getClasses } from "@/domains/academics/actions/academics.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import FinanceClient from "./finance-client";

export default async function FinancePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string, class?: string, status?: string }> 
}) {
  // throw new Error("Testing if FinancePage is reached");
  console.log("FinancePage: Starting render...");
  const params = await searchParams;

  try {
    // 1. Sync data first to ensure everything is up to date
    await syncStudentFees(false);

    // 2. Fetch all required data in parallel with a timeout
    console.log("FinancePage: Fetching data in parallel...");
    
    const [feesRes, statsRes, classesRes, currentUser] = await Promise.all([
      getStudentFees({
        search: params.search,
        class: params.class,
        status: params.status
      }),
      getFinanceStats(),
      getClasses(),
      getCurrentUser()
    ]);

    const user = currentUser as any;
    const canEdit = user?.admin || user?.role?.permissions?.some((p: any) => p.moduleName === "Finance" && p.canEdit);
    const canDelete = user?.admin || user?.role?.permissions?.some((p: any) => p.moduleName === "Finance" && p.canDelete);

    console.log("FinancePage: Data fetch complete.");

    return (
      <FinanceClient 
        fees={((feesRes?.data ?? []) as unknown) as any[]}
        stats={(statsRes?.data ?? {}) as any}
        classes={((classesRes?.data ?? []) as unknown) as any[]}
        canEdit={!!canEdit}
        canDelete={!!canDelete}
      />
    );
  } catch (error) {
    console.error("FinancePage Error:", error);
    return (
      <div className="p-8 text-center text-rose-500">
        <h2 className="text-xl font-bold">Erreur de chargement</h2>
        <p>{error instanceof Error ? error.message : "Une erreur inconnue est survenue"}</p>
      </div>
    );
  }
}
