"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

export function DashboardLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // We could implement a real progress bar here if we wanted
    // For now we just reset it on route change
    setIsLoading(false);
  }, [pathname, searchParams]);

  return (
    <div 
      className={`fixed top-0 left-0 right-0 h-1 bg-indigo-600 z-[100] transition-all duration-500 ease-out origin-left ${
        isLoading ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
      }`}
    />
  );
}
