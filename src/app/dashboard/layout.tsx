import * as React from "react";
import DashboardSidebar from "./sidebar";
import { DashboardLoadingBar } from "./loading-bar";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import { getUnreadNotificationsCount } from "@/domains/messaging/actions/notifications.actions";
import { NavigationProgressProvider } from "@/components/providers/navigation-progress";
import SyncStatus from "@/components/common/SyncStatus";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadNotificationsCount();
  } catch (e) {
    console.warn("⚠️ Failed to fetch unread notifications count in layout.");
  }
  
  // Fetch branch data based on user's educational level and schoolId
  const { branchData, allBranches } = await getActiveBranchData(user);

  // Final branding fallback: if no branch data found, use school data from user object
  const isGeneralAdmin = !branchData && allBranches && allBranches.length > 0;
  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: isGeneralAdmin ? "Administration Générale" : (branchData?.instType || user?.educationalLevel || "Gestion Scolaire")
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-background dark:bg-[#08090e] gradient-bg font-sans relative transition-colors duration-300" dir="ltr">
      <React.Suspense fallback={null}>
        <NavigationProgressProvider>
          <DashboardLoadingBar />
          <SyncStatus />

          <div className="flex h-full max-h-full gap-4 p-4 overflow-hidden">
            <DashboardSidebar 
              user={user} 
              branch={branchData} 
              branding={branding}
              allBranches={allBranches}
              unreadNotificationsCount={unreadCount} 
            />
            <main className="flex-1 min-w-0 overflow-y-auto h-full rounded-[32px]">
              <div className="min-h-full bg-transparent">
                {children}
              </div>
            </main>
          </div>
        </NavigationProgressProvider>
      </React.Suspense>
    </div>
  );
}
