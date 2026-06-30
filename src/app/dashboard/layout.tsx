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
  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  return (
    <div className="min-h-screen bg-background gradient-bg font-sans relative" dir="ltr">
      <React.Suspense fallback={null}>
        <NavigationProgressProvider>
          <DashboardLoadingBar />
          <SyncStatus />

          <div className="flex min-h-screen gap-4 p-4">
            <DashboardSidebar 
              user={user} 
              branch={branchData} 
              branding={branding}
              allBranches={allBranches}
              unreadNotificationsCount={unreadCount} 
            />
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="min-h-[calc(100vh-32px)] rounded-[32px] bg-transparent">
                {children}
              </div>
            </main>
          </div>
        </NavigationProgressProvider>
      </React.Suspense>
    </div>
  );
}
