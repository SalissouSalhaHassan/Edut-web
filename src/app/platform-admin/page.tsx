export const dynamic = "force-dynamic";

import {
  getGlobalPlatformStats,
  getAllSchools,
  getGlobalAuditLogs
} from "@/domains/platform/actions/platform.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { Building2, Users, GraduationCap, DollarSign, Bell, TrendingUp, Activity, House } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddSchoolDialog } from "./components/AddSchoolDialog";
import { SchoolManagerNew } from "./components/SchoolManagerNew";
import { PlatformChartsNew } from "./components/PlatformChartsNew";
import { PlanDonutChart } from "./components/PlanDonutChart";
import Link from "next/link";

function formatCfa(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

export default async function PlatformAdminPage() {
  const [statsRes, schoolsRes, logsRes, currentUser] = await Promise.all([
    getGlobalPlatformStats(),
    getAllSchools(),
    getGlobalAuditLogs(),
    getCurrentUser(),
  ]);

  const stats = statsRes.success
    ? statsRes.data || { schools: 0, students: 0, users: 0, revenue: 0 }
    : { schools: 0, students: 0, users: 0, revenue: 0 };
  const schoolsList = schoolsRes.success ? schoolsRes.data || [] : [];
  const logs = logsRes.success ? logsRes.data || [] : [];

  const userName = currentUser?.nomPrenom || currentUser?.utilisateur || "Super Admin";
  const now = new Date();

  // Compute plan distribution
  const planCounts = { premium: 0, basic: 0, gratuit: 0 };
  for (const s of schoolsList as any[]) {
    if (s.plan === "premium" || s.plan === "enterprise") planCounts.premium++;
    else if (s.plan === "basic") planCounts.basic++;
    else planCounts.gratuit++;
  }
  const totalSchoolsForPlan = schoolsList.length || 1;

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans">
      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Bonjour, {userName} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Voici un aperçu complet de votre plateforme.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">Dernière mise à jour</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5 leading-none">
                {format(now, "d MMM yyyy", { locale: fr })} &nbsp;
                <span className="text-slate-500">{format(now, "HH:mm")}</span>
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <House className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <AddSchoolDialog />
          <Link
            href="/dashboard"
            className="relative w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              3
            </span>
          </Link>
        </div>
      </header>

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: "TOTAL ÉCOLES",
              value: stats.schools,
              sub: "Toutes les écoles actives",
              icon: Building2,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-500",
              trend: null,
            },
            {
              label: "TOTAL ÉLÈVES",
              value: stats.students,
              sub: "+12 ce mois",
              icon: GraduationCap,
              iconBg: "bg-violet-50",
              iconColor: "text-violet-500",
              trend: "+12",
              trendUp: true,
            },
            {
              label: "TOTAL UTILISATEURS",
              value: stats.users,
              sub: "Administrateurs et staff",
              icon: Users,
              iconBg: "bg-pink-50",
              iconColor: "text-pink-500",
              trend: null,
            },
            {
              label: "REVENU GLOBAL",
              value: formatCfa(stats.revenue),
              sub: "+8.5% ce mois",
              icon: DollarSign,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-500",
              trend: "+8.5%",
              trendUp: true,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-6 flex items-start gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-2xl font-black text-slate-900 leading-tight">{card.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {card.trend && (
                    <span className={`text-xs font-bold ${card.trendUp ? "text-emerald-500" : "text-rose-500"} flex items-center gap-0.5`}>
                      {card.trendUp ? <TrendingUp className="w-3 h-3" /> : null}
                      {card.trend}
                    </span>
                  )}
                  <p className="text-xs text-slate-400">{card.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT: Chart + Table */}
          <div className="xl:col-span-2 space-y-6">
            {/* Growth Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Croissance de la Plateforme</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Revenus et écoles (6 derniers mois)</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors">
                  6 derniers mois
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <PlatformChartsNew />
            </div>

            {/* Schools Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50">
                <h2 className="text-lg font-black text-slate-900">Gestion des Écoles</h2>
                <p className="text-xs text-slate-400 mt-0.5">Liste complète des établissements partenaires</p>
              </div>
              <SchoolManagerNew schools={schoolsList} />
            </div>
          </div>

          {/* RIGHT: Recent Activities + Plan Distribution */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Activités Récentes</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Surveillance en temps réel</p>
                </div>
                <Link href="/dashboard/security/audit-logs" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Voir tout
                </Link>
              </div>

              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                    <Activity className="w-7 h-7 text-slate-200" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">Aucune activité enregistrée.</p>
                  <p className="text-xs text-slate-300 mt-1">Les nouvelles activités apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-4 mt-2">
                  {(logs as any[]).slice(0, 8).map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.action === "INSERT" ? "bg-emerald-50 text-emerald-600" :
                        log.action === "UPDATE" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {log.user?.nomPrenom || log.user?.utilisateur || "—"}{" "}
                          <span className="text-slate-400 font-normal">
                            a {log.action === "INSERT" ? "créé" : log.action === "UPDATE" ? "modifié" : "supprimé"} dans{" "}
                          </span>
                          <span className="font-bold">{log.school?.name || "—"}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {format(new Date(log.timestamp), "HH:mm - d MMM", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plan Distribution */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-base font-black text-slate-900 mb-1">Répartition des Forfaits</h3>
              <p className="text-xs text-slate-400 mb-5">Répartition par type d'abonnement</p>

              <PlanDonutChart
                data={[
                  { name: "Premium", value: planCounts.premium, color: "#f59e0b", percent: Math.round((planCounts.premium / totalSchoolsForPlan) * 100) },
                  { name: "Basic", value: planCounts.basic, color: "#3b82f6", percent: Math.round((planCounts.basic / totalSchoolsForPlan) * 100) },
                  { name: "Gratuit", value: planCounts.gratuit, color: "#10b981", percent: Math.round((planCounts.gratuit / totalSchoolsForPlan) * 100) },
                ]}
                totalSchools={schoolsList.length}
              />

              {/* Info note */}
              {planCounts.premium > 0 && (
                <div className="mt-5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700 font-medium leading-snug">
                    <span className="font-bold">{planCounts.premium} école{planCounts.premium > 1 ? "s" : ""}</span> utilisent le forfait Premium.
                    <br />C&apos;est {Math.round((planCounts.premium / totalSchoolsForPlan) * 100)}% de votre plateforme.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Help FAB */}
      <button className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-colors z-50">
        <span className="text-xl font-bold leading-none">?</span>
      </button>
    </div>
  );
}
