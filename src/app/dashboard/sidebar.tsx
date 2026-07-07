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
  BookMarked,
  Brain,
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
  Microscope,
  Package,
  MapPin,
  Printer,
  Store,
  Settings,
  Shield,
  ShieldAlert,
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
  RefreshCw,
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

type NavSection = {
  id: string;
  title: string;
  dotColor: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    id: "general",
    title: "VUE GÉNÉRALE",
    dotColor: "bg-indigo-500",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/reports", label: "Rapports généraux", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/data-quality", label: "Qualité des données", icon: <ShieldAlert className="size-[18px]" />, color: "text-rose-500" },
    ],
  },
  {
    id: "schooling",
    title: "SCOLARITÉ",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/students", label: "Élèves", icon: <Users className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/students/discipline", label: "Discipline", icon: <Shield className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/students/promote", label: "Promotions", icon: <GraduationCap className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/attendance", label: "Présences élèves", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics", label: "Gestion académique", icon: <BookOpen className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/sections", label: "Sections / Filières", icon: <Bookmark className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/academics/pedagogical-units", label: "Unités pédagogiques", icon: <UsersRound className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/exams", label: "Examens", icon: <ClipboardList className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/grades", label: "Notes & résultats", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/timetable", label: "Emploi du temps", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/academics/research-graduation", label: "Diplômes & recherche", icon: <Award className="size-[18px]" />, color: "text-purple-500" },
      { href: "/dashboard/hr/attendance/teacher/me", label: "Ma présence", icon: <ClipboardCheck className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/academics/homework", label: "Devoirs", icon: <FileBarChart2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/academics/devoirs", label: "Devoirs IA", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/academics/research-graduation", label: "Mémoires & PFE", icon: <GraduationCap className="size-[18px]" />, color: "text-purple-500" },
    ],
  },
  {
    id: "pedagogie",
    title: "PÉDAGOGIE",
    dotColor: "bg-violet-500",
    items: [
      { href: "/dashboard/pedagogie", label: "Tableau de bord pédagogique", icon: <LayoutDashboard className="size-[18px]" />, color: "text-violet-600" },
      { href: "/dashboard/analytics", label: "Analyses prédictives & BI", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/pedagogie/cahier-textes", label: "Cahier de textes", icon: <BookMarked className="size-[18px]" />, color: "text-violet-500" },
      { href: "/dashboard/pedagogie/planification", label: "Planification pédagogique", icon: <CalendarCheck2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/pedagogie/progression", label: "Suivi de progression", icon: <FileBarChart2 className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/pedagogie/ressources", label: "Ressources pédagogiques", icon: <LibraryBig className="size-[18px]" />, color: "text-violet-500" },
      { href: "/dashboard/pedagogie/devoirs", label: "Devoirs & corrections", icon: <ClipboardList className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/pedagogie/remediation", label: "Remédiation pédagogique", icon: <GraduationCap className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/pedagogie/inspection", label: "Inspection pédagogique", icon: <Microscope className="size-[18px]" />, color: "text-cyan-500" },
      { href: "/dashboard/pedagogie/rapports", label: "Rapports pédagogiques", icon: <FileText className="size-[18px]" />, color: "text-slate-600" },
    ],
  },
  {
    id: "finance",
    title: "FINANCES",
    dotColor: "bg-emerald-500",
    items: [
      { href: "/dashboard/finance", label: "Gestion financière", icon: <Wallet className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/coges", label: "Paiement COGES", icon: <BriefcaseBusiness className="size-[18px]" />, color: "text-indigo-500" },
    ],
  },
  {
    id: "administration",
    title: "ADMINISTRATION",
    dotColor: "bg-violet-500",
    items: [
      { href: "/dashboard/admin-docs", label: "Administration & attestations", icon: <FileText className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/admin-docs/admit-cards", label: "Cartes d'admission", icon: <IdCard className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/id-cards", label: "Cartes d'identité", icon: <IdCard className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/importation", label: "Importation intelligente", icon: <Package className="size-[18px]" />, color: "text-indigo-600" },
      { href: "/dashboard/front-office", label: "Accueil administratif", icon: <Building2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/print-demo", label: "Impression officielle", icon: <Printer className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
  {
    id: "canevas",
    title: "CANEVAS SCOLAIRES",
    dotColor: "bg-cyan-500",
    items: [
      { href: "/dashboard/canevas", label: "Tableau de bord canevas", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/etablissements", label: "Établissements", icon: <Building2 className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/canevas/reporting", label: "Centre de reporting", icon: <BarChart3 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/canevas/export", label: "Export canevas", icon: <Download className="size-[18px]" />, color: "text-slate-500" },
    ],
  },
  {
    id: "resources",
    title: "RESSOURCES",
    dotColor: "bg-amber-500",
    items: [
      { href: "/dashboard/hr", label: "Personnel", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/hr/reports", label: "Rapports du personnel", icon: <FileBarChart2 className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/inventory", label: "Inventaire", icon: <Package className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/library", label: "Bibliothèque", icon: <LibraryBig className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/transport", label: "Transport", icon: <Bus className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/hostel", label: "Internat", icon: <Home className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/canteen", label: "Cantine", icon: <Store className="size-[18px]" />, color: "text-amber-500" },
      { href: "/dashboard/pos", label: "Point de vente", icon: <UsersRound className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/lms", label: "Formation en ligne", icon: <BookOpen className="size-[18px]" />, color: "text-indigo-500" },
    ],
  },
  {
    id: "communication",
    title: "COMMUNICATION",
    dotColor: "bg-pink-500",
    items: [
      { href: "/dashboard/messaging", label: "Messagerie", icon: <MessageSquare className="size-[18px]" />, color: "text-pink-500", badge: "12", badgeColor: "bg-pink-50 text-pink-600" },
      { href: "/dashboard/notifications", label: "Notifications", icon: <Bell className="size-[18px]" />, color: "text-amber-500", badge: "5", badgeColor: "bg-amber-50 text-amber-600" },
    ],
  },
  {
    id: "system",
    title: "SYSTÈME",
    dotColor: "bg-slate-500",
    items: [
      { href: "/dashboard/security", label: "Sécurité", icon: <Shield className="size-[18px]" />, color: "text-emerald-500" },
      { href: "/dashboard/security/users", label: "Utilisateurs & équipes", icon: <UserRound className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/security/audit-logs", label: "Journal d'audit", icon: <ClipboardList className="size-[18px]" />, color: "text-rose-500" },
      { href: "/dashboard/settings", label: "Paramètres", icon: <Settings className="size-[18px]" />, color: "text-indigo-500" },
      { href: "/dashboard/synchronisation", label: "Synchronisation", icon: <RefreshCw className="size-[18px]" />, color: "text-blue-500" },
      { href: "/dashboard/campus-setup", label: "Configuration campus", icon: <MapPin className="size-[18px]" />, color: "text-amber-500" },
    ],
  },
  {
    id: "support",
    title: "ASSISTANCE",
    dotColor: "bg-blue-500",
    items: [
      { href: "/dashboard/help", label: "Aide et support", icon: <HelpCircle className="size-[18px]" />, color: "text-blue-500" },
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
    const roleNameLower = (user?.role?.roleName || "").toLowerCase();

    const isDirecteur = user?.admin === true || isSuperAdmin || roleNameLower.includes("directeur") || roleNameLower.includes("dirigeant");
    const isPedago = roleNameLower.includes("responsable pédagogique") || roleNameLower.includes("inspecteur") || roleNameLower.includes("censeur") || roleNameLower.includes("études");
    const isTeacher = roleNameLower.includes("professeur") || roleNameLower.includes("enseignant") || roleNameLower.includes("teacher");
    const isStudent = roleNameLower.includes("élève") || roleNameLower.includes("etudiant") || roleNameLower.includes("student");
    const isParent = roleNameLower.includes("parent") || roleNameLower.includes("tuteur") || roleNameLower.includes("famille");

    const isLevelDirector = !isSuperAdmin && user?.admin === true && user?.educationalLevel && user?.educationalLevel !== "Tous" && user?.educationalLevel !== "All";

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

      if (isTeacher) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/students",
            "/dashboard/attendance",
            "/dashboard/academics/exams",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/hr/attendance/teacher/me",
            "/dashboard/academics/homework",
            "/dashboard/academics/pedagogical-units",
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie",
            "/dashboard/pedagogie/cahier-textes",
            "/dashboard/pedagogie/planification",
            "/dashboard/pedagogie/progression",
            "/dashboard/pedagogie/ressources",
            "/dashboard/pedagogie/devoirs",
            "/dashboard/pedagogie/remediation"
          ].includes(item.href));
        }
      } else if (isStudent) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/attendance",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/academics/homework"
          ].includes(item.href));
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie/ressources",
            "/dashboard/pedagogie/devoirs",
            "/dashboard/pedagogie/progression"
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        }
      } else if (isParent) {
        if (section.id === "general") {
          items = items.filter((item) => item.href === "/dashboard");
        } else if (section.id === "schooling") {
          items = items.filter((item) => [
            "/dashboard/attendance",
            "/dashboard/academics/grades",
            "/dashboard/academics/timetable",
            "/dashboard/academics/homework"
          ].includes(item.href));
        } else if (section.id === "pedagogie") {
          items = items.filter((item) => [
            "/dashboard/pedagogie/progression",
            "/dashboard/pedagogie/devoirs"
          ].includes(item.href));
        } else if (["finance", "administration", "canevas", "resources", "system"].includes(section.id)) {
          items = [];
        }
      } else {
        // Administration / Directeur / Responsable pédagogique (Admin permissions)
        items = items.filter((item) => item.href !== "/dashboard/hr/attendance/teacher/me");

        if (isLevelDirector && section.id === "system") {
          items = items.filter((item) => [
            "/dashboard/security",
            "/dashboard/security/users",
            "/dashboard/security/audit-logs",
          ].includes(item.href));
        }
      }

      if (isSuperAdmin && section.id === "system") {
        items = items.filter((item) => item.href !== "/dashboard/security/audit-logs");
      }

      return {
        ...section,
        items,
      };
    });

    filtered = filtered.filter((section) => section.items.length > 0);

    if (isSuperAdmin) {
      filtered.unshift({
        id: "owner",
        title: "PROPRIÉTAIRE",
        dotColor: "bg-red-500",
        items: [
          {
            href: "/platform-admin",
            label: "Gestion de la plateforme",
            icon: <Globe className="size-[18px]" />,
            color: "text-red-500",
          },
          {
            href: "/dashboard/security/audit-logs",
            label: "Audit global",
            icon: <Shield className="size-[18px]" />,
            color: "text-indigo-500",
          },
          {
            href: "/dashboard/super-admin",
            label: "Console administrateur",
            icon: <Settings className="size-[18px]" />,
            color: "text-amber-500",
          },
          {
            href: "/dashboard/subscription",
            label: "Gestion des abonnements",
            icon: <Wallet className="size-[18px]" />,
            color: "text-emerald-500",
          },
          {
            href: "/register-school",
            label: "Inscription école",
            icon: <Building2 className="size-[18px]" />,
            color: "text-pink-500",
          },
        ],
      });
    }

    if (!isTeacher && !isSuperAdmin) {
      const systemSection = filtered.find((section) => section.id === "system");
      if (systemSection) {
        systemSection.items.push({
          href: "/dashboard/subscription",
          label: "Mon abonnement",
          icon: <Wallet className="size-[18px]" />,
          color: "text-indigo-600",
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
              value={branch?.id?.toString() || "all"}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-indigo-100/80 bg-slate-50 hover:bg-slate-100/70 px-3 py-2 pr-8 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="all">Administration générale (toutes)</option>
              {allBranches.map((b: any) => (
                <option key={b.id} value={b.id?.toString()}>
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
          <div key={section.id} className="space-y-2.5">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span
                className={cn(
                  section.id === "general" ? "text-indigo-600" :
                  section.id === "schooling" ? "text-blue-500" :
                  section.id === "pedagogie" ? "text-violet-600" :
                  section.id === "finance" ? "text-emerald-600" :
                  section.id === "administration" ? "text-violet-600" :
                  section.id === "canevas" ? "text-cyan-600" :
                  section.id === "resources" ? "text-amber-600" :
                  section.id === "communication" ? "text-pink-500" :
                  section.id === "owner" ? "text-red-600" :
                  "text-slate-600"
                )}
              >
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
