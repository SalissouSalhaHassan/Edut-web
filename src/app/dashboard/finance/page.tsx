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
  console.log("FinancePage: Starting render...");
  const params = await searchParams;

  let fees: any[] = [];
  let stats: any = {};
  let classes: any[] = [];
  let advancedStats: any = null;
  let headerConfig: any = null;

  try {
    // 1. Sync data first safely
    try {
      await syncStudentFees(false);
    } catch (e) {
      console.warn("[FinancePage] Failed to sync student fees:", e);
    }

    // 2. Fetch all required data in parallel
    console.log("FinancePage: Fetching data in parallel...");
    
    const [feesRes, statsRes, classesRes, advancedStatsRes, headerConfigRes] = await Promise.all([
      getStudentFees({
        search: params.search,
        class: params.class,
        status: params.status
      }).catch(() => ({ data: [] })),
      getFinanceStats().catch(() => ({ data: {} })),
      getClasses(true).catch(() => ({ data: [] })),
      getAdvancedFinanceStats().catch(() => ({ data: null })),
      getDocumentHeaderConfig().catch(() => ({ data: null })),
    ]);

    fees = ((feesRes?.data ?? []) as unknown) as any[];
    stats = (statsRes?.data ?? {}) as any;
    classes = ((classesRes?.data ?? []) as unknown) as any[];
    advancedStats = (advancedStatsRes?.data ?? null) as any;
    headerConfig = (headerConfigRes?.data ?? null) as any;

  } catch (error) {
    console.warn("FinancePage Parallel Fetch Warning - falling back to client cache:", error);
  }

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
