"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigationProgress } from "@/components/providers/navigation-progress";
import {
  Award,
  Backpack,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  FileText,
  CalendarCheck2,
  Globe,
  GraduationCap,
  Home,
  IdCard,
  LibraryBig,
  Mail,
  LayoutDashboard,
  MessageSquare,
  Package,
  MapPin,
  Printer,
  Store,
  Settings,
  Shield,
  UsersRound,
  UserRound,
  Users,
  Wallet,
  Loader2,
  LogOut,
  Bookmark,
  ChevronRight,
  ChevronsLeft,
  ChevronDown,
  Bell,
  HelpCircle,
  Info,
  Download,
} from "lucide-react";
import { logout } from "@/domains/auth/actions/login";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeColor?: string;
};

const sections: Array<{ title: string; dotColor: string; items: NavItem[] }> = [
  {
    title: "GÉNÉRAL",
    dotColor: "bg-indigo-500",
    items: [
      { href: "/dashboard", label: "Tableau de Bord", icon: <LayoutDashboard className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/reports", label: "Rapports", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/security", label: "Sécurité", icon: <Shield className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/security/users", label: "Utilisateurs", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/security/audit-logs", label: "Audit Global", icon: <ClipboardList className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/settings", label: "Paramètres", icon: <Settings className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/campus-setup", label: "Configuration Campus", icon: <MapPin className="size-[18px]" />, color: "text-amber-500" },
    ],
  },
  {
    title: "SCOLARITÉ",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/students", label: "Élèves", icon: <Users className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/students/discipline", label: "Discipline", icon: <Shield className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/students/promote", label: "Promotion", icon: <GraduationCap className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/attendance", label: "Présence", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics", label: "Académique", icon: <BookOpen className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/sections", label: "Sections / Filières", icon: <Bookmark className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/academics/pedagogical-units", label: "Unités Pédagogiques (UP)", icon: <UsersRound className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/exams", label: "Examens", icon: <ClipboardList className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/grades", label: "Notes & Résultats", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/timetable", label: "Emploi du Temps", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/academics/research-graduation", label: "Graduation & Recherche", icon: <Award className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/hr/attendance/teacher/me", label: "Ma Présence", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/homework", label: "Devoirs", icon: <FileBarChart2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/devoirs", label: "Devoirs (AI)", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/research-graduation", label: "Mémoires & PFE", icon: <GraduationCap className="size-[18px]" />, color: "text-purple-500" },
    ],
  },
  {
    title: "COMMUNICATION",
    dotColor: "bg-pink-500",
    items: [
      { href: "/dashboard/messaging", label: "Messagerie", icon: <MessageSquare className="size-[18px]" />, color: "text-pink-500", badge: "12", badgeColor: "bg-pink-50 text-pink-600" },
      { href: "/dashboard/notifications", label: "Notifications", icon: <Bell className="size-[18px]" />, color: "text-amber-500", badge: "5", badgeColor: "bg-amber-50 text-amber-600" },
    ],
  },
  {
    title: "GESTION",
    dotColor: "bg-emerald-500",
    items: [
      { href: "/dashboard/finance", label: "Finances", icon: <Wallet className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/canevas", label: "Canevas Scolaires", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/etablissements", label: "Établissements", icon: <Building2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/canevas/reporting", label: "Centre de Reporting", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/export", label: "Export Canevas", icon: <Download className="size-[18px]" />, color: "text-slate-500" },
      { href: "/dashboard/coges", label: "Paiement COGES", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/hr", label: "Personnel HR", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/importation", label: "Importation", icon: <Package className="size-[18px]" />, color: "text-indigo-600" },
      { href: "/dashboard/hr/reports", label: "Centre de Rapports", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/front-office", label: "Front Office", icon: <Building2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/inventory", label: "Stock", icon: <Package className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/library", label: "Bibliothèque", icon: <LibraryBig className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/transport", label: "Transport", icon: <Bus className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/hostel", label: "Internat", icon: <Home className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/canteen", label: "Cantine", icon: <Store className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/pos", label: "POS", icon: <UsersRound className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/id-cards", label: "Cartes ID", icon: <IdCard className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/admin-docs", label: "\u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0631\u0633\u0645\u064a\u0629", icon: <FileText className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/admin-docs/admit-cards", label: "Cartes d’admission", icon: <IdCard className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/lms", label: "LMS", icon: <BookOpen className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/print-demo", label: "Impression", icon: <Printer className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
  {
    title: "AUTRE",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/help", label: "Aide & Support", icon: <HelpCircle className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/about", label: "À propos", icon: <Info className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
];

const allItems = sections.flatMap((s) => s.items);
const sortedItems = [...allItems].sort((a, b) => b.href.length - a.href.length);

export default function DashboardSidebar({ 
  user, 
  branch,
  branding,
  allBranches = [],
  unreadNotificationsCount
}: { 
  user: any; 
  branch: any;
  branding?: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  allBranches?: any[];
  unreadNotificationsCount?: number;
}) {
  const handleBranchChange = (branchId: string) => {
    document.cookie = `selected_branch_id=${branchId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const isAdmin = user?.admin === true || user?.superAdmin === true || user?.superAdmin === 1;
  const showBranchSwitcher = isAdmin && allBranches && allBranches.length > 1;
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const { startNavigation } = useNavigationProgress();

  const dynamicSections = React.useMemo(() => {
    const isSuperAdmin = Boolean(user?.superAdmin === true || user?.superAdmin === 1);
    const isTeacher = user?.role?.roleName === "Professeur" || user?.role?.roleName === "Enseignant";
    const isLevelDirector = !isSuperAdmin && user?.admin === true && user?.educationalLevel && user?.educationalLevel !== "Tous" && user?.educationalLevel !== "All";

    // Deep copy sections to avoid mutating global state
    let filtered = sections.map((section) => {
      let items = [...section.items].map((item) => {
        if (item.href === "/dashboard/notifications") {
          return {
            ...item,
            badge: unreadNotificationsCount && unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
          };
        }
        return { ...item };
      });

      // Filter items in section based on role
      if (isTeacher) {
        if (section.title === "GÉNÉRAL") {
          items = items.filter(item => item.href === "/dashboard");
        } else if (section.title === "SCOLARITÉ") {
          items = items.filter(item => [
            "/dashboard/students",
            "/dashboard/attendance",
            "/dashboard/academics/exams",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/hr/attendance/teacher/me",
            "/dashboard/academics/homework",
            "/dashboard/academics/pedagogical-units"
          ].includes(item.href));
        } else if (section.title === "GESTION") {
          items = []; // Hide all management tabs
        }
      } else {
        // Non-teacher: filter out personal attendance link
        items = items.filter(item => item.href !== "/dashboard/hr/attendance/teacher/me");
        
        if (isLevelDirector) {
          if (section.title === "GÉNÉRAL") {
            items = items.filter(item => [
              "/dashboard",
              "/dashboard/reports",
              "/dashboard/security",
              "/dashboard/security/users",
              "/dashboard/security/audit-logs"
            ].includes(item.href));
          }
        }
      }

      // Filter out Audit Global from GENERAL for super admins to avoid duplication
      if (isSuperAdmin && section.title === "GÉNÉRAL") {
        items = items.filter(item => item.href !== "/dashboard/security/audit-logs");
      }

      return {
        ...section,
        items
      };
    });

    // Remove empty sections (e.g. GESTION for teachers)
    filtered = filtered.filter(section => section.items.length > 0);

    // If super admin, add administration section at the top
    if (isSuperAdmin) {
      filtered.unshift({
        title: "PROPRIÉTAIRE",
        dotColor: "bg-red-500",
        items: [
          { 
            href: "/platform-admin", 
            label: "Gestion Plateforme", 
            icon: <Globe className="size-[18px]" />, 
            color: "text-red-500"
          },
          { 
            href: "/dashboard/security/audit-logs", 
            label: "Audit Global", 
            icon: <Shield className="size-[18px]" />, 
            color: "text-indigo-500" 
          },
          { 
            href: "/dashboard/super-admin", 
            label: "Console Admin (Legacy)", 
            icon: <Settings className="size-[18px]" />, 
            color: "text-amber-500" 
          },
          { 
            href: "/dashboard/subscription", 
            label: "Gestion des Abonnements", 
            icon: <Wallet className="size-[18px]" />, 
            color: "text-emerald-500" 
          },
          { 
            href: "/register-school", 
            label: "Lien d'Inscription", 
            icon: <Building2 className="size-[18px]" />, 
            color: "text-pink-500" 
          },
        ],
      });
    }

    // Add "Mon Abonnement" to the GENERAL section for directors and admins
    if (!isTeacher && !isSuperAdmin) {
      const generalSection = filtered.find(s => s.title === "GÉNÉRAL");
      if (generalSection) {
        generalSection.items.push({
          href: "/dashboard/subscription",
          label: "Mon Abonnement",
          icon: <Wallet className="size-[18px]" />,
          color: "text-indigo-600"
        });
      }
    }

    return filtered;
  }, [unreadNotificationsCount, user?.superAdmin, user?.admin, user?.role?.roleName, user?.educationalLevel, user?.id]);

  const allPlatformItems = dynamicSections.flatMap((s) => s.items);
  const sortedPlatformItems = [...allPlatformItems].sort((a, b) => b.href.length - a.href.length);

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const activeHref = React.useMemo(() => {
    if (pathname === "/dashboard") return "/dashboard";
    for (const item of sortedPlatformItems) {
      if (item.href !== "/dashboard" && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
        return item.href;
      }
    }
    return "/dashboard";
  }, [pathname, sortedPlatformItems]);

  return (
    <aside className="w-[300px] shrink-0 rounded-[32px] bg-white border border-indigo-200/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.08)] overflow-hidden flex flex-col h-full relative print:hidden">
      {/* HEADER */}
      <div className="p-6 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[18px] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 overflow-hidden shrink-0">
              {branding?.logoPath || branch?.logoPath ? (
                <img src={branding?.logoPath || branch.logoPath} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="size-[22px]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-[17px] leading-tight truncate">
                {branding?.name || branch?.branchName || "École Plus"}
              </p>
              <p className="text-xs font-semibold text-slate-500 truncate">
                {branding?.level || user?.educationalLevel || "Gestion Scolaire"}
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0">
            <ChevronsLeft className="size-4" />
          </button>
        </div>

        {showBranchSwitcher && (
          <div className="relative">
            <select
              value={branch?.id || ""}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-indigo-100/80 bg-slate-50 hover:bg-slate-100/70 px-3 py-2 pr-8 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer shadow-sm"
            >
              {allBranches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.branchName} ({b.instType})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500 pointer-events-none" />
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="px-5 pb-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {dynamicSections.map((section) => (
          <div key={section.title} className="space-y-2.5">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span className={cn(section.title === "GÉNÉRAL" ? "text-indigo-600" : section.title === "SCOLARITÉ" ? "text-blue-500" : section.title === "COMMUNICATION" ? "text-pink-500" : "text-blue-500")}>
                {section.title}
              </span>
              <span className={cn("w-1 h-1 rounded-full", section.dotColor)} />
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = activeHref === item.href;
                const isPending = pendingHref === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    scroll={true}
                    prefetch={false}
                    onClick={() => {
                        setPendingHref(item.href);
                        startNavigation();
                      }}
                    className={cn(
                      "group relative flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-all duration-300",
                      active
                        ? "bg-gradient-to-r from-transparent to-indigo-100/50"
                        : "hover:bg-slate-50"
                    )}
                  >
                    {/* Active Right Indicator Line */}
                    {active && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full" />
                    )}

                    <span className="flex items-center gap-4">
                      <span
                        className={cn(
                          "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-300 relative",
                          active
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : cn("bg-white border border-slate-100/80 group-hover:border-slate-200 group-hover:bg-slate-50 shadow-sm", item.color)
                        )}
                      >
                        {isPending ? <Loader2 className="size-[18px] animate-spin text-indigo-600" /> : item.icon}
                      </span>
                      <span className={cn("text-sm", active ? "font-bold text-indigo-700" : "font-semibold text-slate-700 group-hover:text-slate-900 transition-colors")}>
                        {item.label}
                      </span>
                    </span>

                    {/* Right Chevron or Badge */}
                    {item.badge && !isPending ? (
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", item.badgeColor)}>
                        {item.badge}
                      </span>
                    ) : !active ? (
                      <ChevronRight className="size-[15px] text-slate-300 group-hover:text-slate-400 transition-colors mr-1" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER (Profile & Logout) */}
      <div className="p-4 mt-auto shrink-0 border-t border-slate-50/50">
        <button
          onClick={() => logout()}
          className="w-full text-left"
        >
          <div className="rounded-[24px] bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/30 p-2.5 flex items-center justify-between transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-200/50">
                  {user?.nomPrenom?.charAt(0) || user?.utilisateur?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-900 truncate">
                  {user?.nomPrenom || user?.utilisateur || "Utilisateur"}
                </p>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  {user?.admin ? "Administrateur" : user?.role?.roleName || "Membre"}
                </p>
              </div>
            </div>
            <ChevronDown className="size-[15px] text-slate-400 group-hover:text-slate-600 mr-2 shrink-0 transition-colors" />
          </div>
        </button>
      </div>
    </aside>
  );
}
