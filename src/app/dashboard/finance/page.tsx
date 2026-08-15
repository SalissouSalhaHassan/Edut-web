export const dynamic = "force-dynamic";

import { getStudentFees, getFinanceStats, syncStudentFees, getAdvancedFinanceStats } from "@/domains/finance/actions/finance.actions";
import { getClasses } from "@/domains/academics/actions/academics.actions";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import FinanceClient from "./finance-client";

export default async function FinancePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string, class?: string, status?: string }> 
}) {
  const params = await searchParams;

  let fees: any[] = [];
  let classes: any[] = [];
  let advancedStats: any = null;
  let headerConfig: any = null;

  try {
    // Fetch only essential data in parallel without blocking sync
    const [feesRes, classesRes, advancedStatsRes, headerConfigRes] = await Promise.all([
      getStudentFees({
        search: params.search,
        class: params.class,
        status: params.status
      }).catch(() => ({ data: [] })),
      getClasses(true).catch(() => ({ data: [] })),
      getAdvancedFinanceStats().catch(() => ({ data: null })),
      getDocumentHeaderConfig().catch(() => ({ data: null })),
    ]);

    fees = ((feesRes?.data ?? []) as unknown) as any[];
    classes = ((classesRes?.data ?? []) as unknown) as any[];
    advancedStats = (advancedStatsRes?.data ?? null) as any;
    headerConfig = (headerConfigRes?.data ?? null) as any;

  } catch (error) {
    console.warn("FinancePage Parallel Fetch Warning - falling back to client cache:", error);
  }

  const stats = {
    totalExpected: advancedStats?.totalExpected || 0,
    totalCollected: advancedStats?.totalPaid || 0,
    totalDebts: advancedStats?.totalDebts || 0,
  };

  return (
    <FinanceClient 
      fees={fees}
      stats={stats}
      classes={classes}
      advancedStats={advancedStats}
      headerConfig={headerConfig}
    />
  );
}
