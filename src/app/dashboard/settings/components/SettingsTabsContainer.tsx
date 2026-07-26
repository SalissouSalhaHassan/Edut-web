"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, CreditCard, BookOpen, LayoutGrid, Shield, Bell, Database, FileText } from "lucide-react";

interface SettingsTabsContainerProps {
  initialTab: string;
  generalContent: React.ReactNode;
  financeContent: React.ReactNode;
  academicContent: React.ReactNode;
  curriculumContent: React.ReactNode;
  securityContent: React.ReactNode;
  notificationsContent: React.ReactNode;
  systemContent: React.ReactNode;
  headersContent: React.ReactNode;
}

export function SettingsTabsContainer({
  initialTab,
  generalContent,
  financeContent,
  academicContent,
  curriculumContent,
  securityContent,
  notificationsContent,
  systemContent,
  headersContent,
}: SettingsTabsContainerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTabFromUrl = searchParams.get("tab") || initialTab || "general";
  const [activeTab, setActiveTab] = useState(currentTabFromUrl);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-3">
        <TabsList className="flex flex-col h-fit bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm gap-2">
          {[
            { v: 'general', l: 'Général', i: <School size={18} /> },
            { v: 'finance', l: 'Finances', i: <CreditCard size={18} /> },
            { v: 'academic', l: 'Académique', i: <BookOpen size={18} /> },
            { v: 'curriculum', l: 'Matières de Base', i: <LayoutGrid size={18} /> },
            { v: 'security', l: 'Sécurité', i: <Shield size={18} /> },
            { v: 'notifications', l: 'Alertes', i: <Bell size={18} /> },
            { v: 'system', l: 'Système', i: <Database size={18} /> },
            { v: 'headers', l: 'En-têtes', i: <FileText size={18} /> },
          ].map((t) => (
            <TabsTrigger 
              key={t.v} 
              value={t.v} 
              className="w-full justify-start rounded-2xl h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-4 data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all border border-transparent data-[state=active]:border-primary/10"
            >
              {t.i} {t.l}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="lg:col-span-9">
        <TabsContent value="general" className="m-0 space-y-8 animate-in slide-in-from-right-4 duration-500">
          {generalContent}
        </TabsContent>

        <TabsContent value="finance" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {financeContent}
        </TabsContent>

        <TabsContent value="academic" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {academicContent}
        </TabsContent>

        <TabsContent value="curriculum" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {curriculumContent}
        </TabsContent>

        <TabsContent value="security" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {securityContent}
        </TabsContent>

        <TabsContent value="notifications" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {notificationsContent}
        </TabsContent>

        <TabsContent value="system" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {systemContent}
        </TabsContent>

        <TabsContent value="headers" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {headersContent}
        </TabsContent>
      </div>
    </Tabs>
  );
}
