"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  Check,
  Sparkles,
  Clock,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Building2,
  ArrowRight,
  TrendingUp,
  Zap,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  FileText,
  Bell,
  ChevronRight,
  Lock,
  Crown,
  Star,
  Rocket,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateMySchoolSubscription } from "@/domains/auth/actions/subscription.actions";

type SchoolType = {
  id: number;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  subscriptionExpiry: Date | string | null;
} | null;

type Tab = "overview" | "plans" | "history" | "billing";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getDaysRemaining(expiry: Date | string | null): number {
  if (!expiry) return 0;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPlanIndex(plan: string | null): number {
  if (plan === "pro") return 1;
  if (plan === "enterprise") return 2;
  return 0;
}

// ─── data ─────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "basic",
    name: "Forfait Basique",
    icon: Star,
    price: "19 000 F CFA",
    usdPrice: "$29",
    period: "par mois",
    color: "blue",
    gradient: "from-blue-500 to-blue-700",
    popular: false,
    description:
      "Pour les petites écoles souhaitant digitaliser leur gestion académique de base.",
    features: [
      "Jusqu'à 100 élèves enregistrés",
      "Gestion académique de base (Classes & Matières)",
      "Gestion des emplois du temps de base",
      "Saisie des notes & Bulletins de base",
      "1 compte Administrateur + 10 comptes Enseignants",
      "Support standard par email",
    ],
  },
  {
    id: "pro",
    name: "Forfait Professionnel",
    icon: Rocket,
    price: "49 000 F CFA",
    usdPrice: "$79",
    period: "par mois",
    color: "indigo",
    gradient: "from-indigo-500 to-purple-700",
    popular: true,
    description:
      "Notre offre phare pour une gestion scolaire moderne, collaborative et 100% connectée.",
    features: [
      "Nombre d'élèves et classes illimités",
      "LMS complet & Classes virtuelles intégrées",
      "Gestion RH & Paie (Fiches de paie automatisées)",
      "Finances & Suivi des paiements COGES",
      "Messagerie & Alertes SMS/Email instantanées aux parents",
      "Générateur de cartes scolaires & Code-barres",
      "Support prioritaire 24/7",
    ],
  },
  {
    id: "enterprise",
    name: "Forfait Entreprise",
    icon: Crown,
    price: "Sur Mesure",
    usdPrice: "Custom",
    period: "engagement annuel",
    color: "emerald",
    gradient: "from-emerald-500 to-teal-700",
    popular: false,
    description:
      "Pour les grands groupes scolaires nécessitant une infrastructure dédiée et de l'IA.",
    features: [
      "Gestion multi-établissements / multi-campus",
      "Générateur d'Emplois du Temps par IA (Automatique)",
      "Sous-domaine personnalisé (ex: votre-ecole.edut.pro)",
      "Intégration API & SSO personnalisés",
      "Sauvegardes quotidiennes redondantes",
      "Formation sur site & Directeur de compte dédié",
    ],
  },
];

// Module access matrix
const MODULES = [
  { name: "Gestion des Élèves", basic: true, pro: true, enterprise: true },
  { name: "Notes & Bulletins", basic: true, pro: true, enterprise: true },
  { name: "Emplois du Temps", basic: "Basique", pro: true, enterprise: true },
  { name: "LMS & e-Learning", basic: false, pro: true, enterprise: true },
  { name: "Gestion RH & Paie", basic: false, pro: true, enterprise: true },
  { name: "Finance & COGES", basic: false, pro: true, enterprise: true },
  { name: "Messagerie & SMS", basic: false, pro: true, enterprise: true },
  { name: "Cartes Scolaires & QR", basic: false, pro: true, enterprise: true },
  { name: "Multi-campus", basic: false, pro: false, enterprise: true },
  { name: "IA Planning", basic: false, pro: false, enterprise: true },
  { name: "Sous-domaine dédié", basic: false, pro: false, enterprise: true },
  { name: "API & SSO custom", basic: false, pro: false, enterprise: true },
];

// Mock billing history
const BILLING_HISTORY = [
  { date: "25 Juil 2026", plan: "Professionnel", amount: "49 000 F CFA", status: "Payé", invoice: "INV-2026-007" },
  { date: "25 Juin 2026", plan: "Professionnel", amount: "49 000 F CFA", status: "Payé", invoice: "INV-2026-006" },
  { date: "25 Mai 2026", plan: "Basique", amount: "19 000 F CFA", status: "Payé", invoice: "INV-2026-005" },
  { date: "25 Avr 2026", plan: "Basique", amount: "19 000 F CFA", status: "Payé", invoice: "INV-2026-004" },
];

// ─── sub-components ────────────────────────────────────────────────────────────

function ModuleCell({ val }: { val: boolean | string }) {
  if (val === true)
    return <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />;
  if (val === false)
    return <X size={16} className="text-slate-300 mx-auto" />;
  return (
    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      {val}
    </span>
  );
}

function ProgressBar({ value, max, color = "indigo" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorMap[color] || "bg-indigo-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function SubscriptionClient({
  initialSchool,
  user,
  allSchools = [],
  isSuperAdmin = false,
}: {
  initialSchool: SchoolType;
  user: any;
  allSchools?: { id: number; name: string; slug: string; plan: string | null; status: string | null; subscriptionExpiry: Date | string | null }[];
  isSuperAdmin?: boolean;
}) {
  const [school, setSchool] = useState<SchoolType>(initialSchool);
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [daysLeft, setDaysLeft] = useState(0);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  useEffect(() => {
    setDaysLeft(getDaysRemaining(school?.subscriptionExpiry ?? null));
  }, [school]);

  const handleUpgrade = (planName: string) => {
    setSelectedPlan(planName);
    startTransition(async () => {
      try {
        const res = await updateMySchoolSubscription(planName);
        if (res.success) {
          toast.success(`Forfait ${planName.toUpperCase()} activé avec succès ! 🎉`);
          const newExpiry = new Date();
          if (planName === "enterprise") {
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          } else {
            newExpiry.setDate(newExpiry.getDate() + 30);
          }
          setSchool((prev) =>
            prev
              ? { ...prev, plan: planName, status: "active", subscriptionExpiry: newExpiry }
              : null
          );
          setActiveTab("overview");
        } else {
          toast.error(res.error || "Une erreur est survenue lors de la mise à niveau.");
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur réseau ou serveur.");
      } finally {
        setSelectedPlan(null);
      }
    });
  };

  // ── Super Admin with no school context & no schools in DB ─────────────────
  if (!school && allSchools.length === 0) {
    return (
      <div className="p-10 min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="max-w-lg w-full border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-10 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Crown size={32} className="text-amber-400" />
            </div>
            <h3 className="text-2xl font-black mb-2">Aucune école enregistrée</h3>
            <p className="text-indigo-200 text-sm font-medium">
              Créez d'abord une école pour gérer son abonnement.
            </p>
          </div>
          <CardContent className="p-8 bg-white">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold shadow-lg gap-2"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <ArrowRight size={16} />
              Retour au Tableau de Bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = school.plan || "basic";
  const currentStatus = school.status || "active";
  const currentPlanIdx = getPlanIndex(currentPlan);
  const formattedExpiry = school.subscriptionExpiry
    ? new Date(school.subscriptionExpiry).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Non spécifiée";

  const maxDays = currentPlan === "enterprise" ? 365 : 30;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isExpired = currentStatus !== "active";

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
    { id: "plans", label: "Changer de forfait", icon: Zap },
    { id: "history", label: "Historique", icon: FileText },
    { id: "billing", label: "Facturation", icon: CreditCard },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <CreditCard size={20} className="text-white" />
            </div>
            Mon Abonnement & Licence
          </h1>
          <p className="text-slate-500 font-semibold mt-1 ml-1">
            Gérez le forfait de <span className="text-slate-800 font-black">{school.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isExpired && (
            <Badge className="px-3 py-1.5 text-xs font-black uppercase rounded-full bg-rose-50 text-rose-600 border-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Abonnement Suspendu
            </Badge>
          )}
          {!isExpired && isExpiringSoon && (
            <Badge className="px-3 py-1.5 text-xs font-black uppercase rounded-full bg-amber-50 text-amber-600 border-none flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={12} />
              Expire dans {daysLeft} jours
            </Badge>
          )}
          {!isExpired && !isExpiringSoon && (
            <Badge className="px-3 py-1.5 text-xs font-black uppercase rounded-full bg-emerald-50 text-emerald-600 border-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Abonnement Actif
            </Badge>
          )}
        </div>
      </div>

      {/* ── Super Admin School Picker ───────────────────────────────────────── */}
      {isSuperAdmin && allSchools.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Crown size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">
              Mode Super Admin — Gestion d'abonnement
            </p>
            <p className="text-xs text-amber-700 font-medium">
              Vous gérez le forfait de : <span className="font-black">{school.name}</span>
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSchoolPicker(v => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer shadow-sm"
            >
              <Building2 size={13} />
              Changer d'école
              <ChevronRight size={12} className={`transition-transform ${showSchoolPicker ? "rotate-90" : ""}`} />
            </button>
            {showSchoolPicker && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 max-h-64 overflow-y-auto">
                  {allSchools.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSchool(s);
                        setShowSchoolPicker(false);
                        setActiveTab("overview");
                      }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer
                        ${school?.id === s.id
                          ? "bg-indigo-50 text-indigo-700 font-black"
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 font-medium capitalize">{s.plan || "basic"}</p>
                      </div>
                      {school?.id === s.id && <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Expiry Alert ───────────────────────────────────────────────────── */}
      {isExpiringSoon && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-900 text-sm">
              Votre abonnement expire dans {daysLeft} jour{daysLeft > 1 ? "s" : ""}
            </p>
            <p className="text-amber-700 text-xs font-medium mt-0.5">
              Renouvelez maintenant pour éviter toute interruption de service.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs gap-1.5 shrink-0"
            onClick={() => setActiveTab("plans")}
          >
            <RefreshCw size={12} />
            Renouveler
          </Button>
        </div>
      )}

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-sm w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer
                ${isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Vue d'ensemble
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">

          {/* Hero summary card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 md:p-10 shadow-2xl text-white">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">
              {/* School info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                    <Building2 size={24} className="text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Établissement</p>
                    <h2 className="text-xl font-black tracking-tight">{school.name}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-indigo-200">
                  <span className="font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 text-xs">
                    {school.slug}.edut.pro
                  </span>
                </div>
              </div>

              {/* Plan info */}
              <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-10">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-400 fill-amber-400" size={20} />
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Forfait Actif</p>
                </div>
                <h3 className="text-3xl font-black capitalize tracking-tight">
                  {currentPlan === "basic" ? "Basique 🟢" : currentPlan === "pro" ? "Professionnel 🔥" : "Entreprise ⚡"}
                </h3>
                <p className="text-xs text-indigo-200/80 font-medium">
                  {PLANS.find(p => p.id === currentPlan)?.price} {PLANS.find(p => p.id === currentPlan)?.period}
                </p>
              </div>

              {/* Expiry info */}
              <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-10">
                <div className="flex items-center gap-2">
                  <Calendar className="text-indigo-300" size={20} />
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Expiration</p>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{formattedExpiry}</h3>
                {daysLeft > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-indigo-200/80 font-medium">
                      <span>{daysLeft} jours restants</span>
                      <span>{maxDays} jours total</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          daysLeft <= 7 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${Math.min(100, (daysLeft / maxDays) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-300 font-bold">Abonnement expiré ou non spécifié</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Élèves enregistrés", value: "124", limit: currentPlan === "basic" ? "/100" : "∞", icon: Users, color: "indigo", pct: currentPlan === "basic" ? 124 : 50 },
              { label: "Enseignants actifs", value: "18", limit: currentPlan === "basic" ? "/10" : "∞", icon: BookOpen, color: "emerald", pct: 60 },
              { label: "Classes & Sections", value: "14", limit: "∞", icon: GraduationCap, color: "amber", pct: 35 },
              { label: "Jours restants", value: daysLeft.toString(), limit: `/${maxDays}`, icon: Clock, color: daysLeft <= 7 ? "rose" : "indigo", pct: Math.min(100, (daysLeft / maxDays) * 100) },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm rounded-[1.75rem] bg-white overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                      ${stat.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                        stat.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                        stat.color === "amber" ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"}`}
                    >
                      <stat.icon size={16} />
                    </div>
                    <span className="text-2xl font-black text-slate-900">
                      {stat.value}
                      <span className="text-sm font-bold text-slate-400">{stat.limit}</span>
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">{stat.label}</p>
                  <ProgressBar value={stat.pct} max={100} color={stat.color === "rose" ? "rose" : stat.color === "amber" ? "amber" : stat.color === "emerald" ? "emerald" : "indigo"} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Module access for current plan */}
          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-slate-900">Modules inclus dans votre forfait</CardTitle>
              <CardDescription className="font-semibold text-slate-500">
                Forfait <span className="capitalize font-black text-indigo-600">{currentPlan}</span> — cliquez sur «Changer de forfait» pour débloquer plus de modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULES.map((mod, i) => {
                  const val = currentPlan === "basic" ? mod.basic : currentPlan === "pro" ? mod.pro : mod.enterprise;
                  const available = val !== false;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                        ${available ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100 opacity-60"}`}
                    >
                      {available ? (
                        typeof val === "string" ? (
                          <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-black text-amber-600">~</span>
                          </span>
                        ) : (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        )
                      ) : (
                        <Lock size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className={`text-sm font-bold ${available ? "text-slate-700" : "text-slate-400"}`}>
                        {mod.name}
                        {typeof val === "string" && <span className="text-amber-600 text-xs ml-1">({val})</span>}
                      </span>
                      {!available && (
                        <Badge
                          className="ml-auto text-[9px] bg-indigo-50 text-indigo-600 border-none font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-100"
                          onClick={() => setActiveTab("plans")}
                        >
                          Pro+
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Trust row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Sécurité de bout en bout", desc: "Transactions cryptées par des protocoles bancaires certifiés.", icon: ShieldCheck },
              { title: "Mise à niveau transparente", desc: "Vos données sont conservées à 100% lors des changements.", icon: TrendingUp },
              { title: "Délai de grâce 15 jours", desc: "Renouvelez après expiration sans aucune coupure de service.", icon: Clock },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-[1.75rem] bg-white border border-slate-100/80 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Plans
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "plans" && (
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Choisissez la formule idéale
            </h2>
            <p className="text-slate-500 font-semibold">
              Mettez à niveau à tout moment — vos données sont conservées intégralement.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = currentPlan === plan.id;
              const isUpgradingThis = selectedPlan === plan.id;
              const isDowngrade = getPlanIndex(plan.id) < currentPlanIdx;

              return (
                <Card
                  key={plan.id}
                  className={`border-none shadow-lg rounded-[2.5rem] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02] bg-white relative
                    ${plan.popular ? "ring-2 ring-indigo-600 ring-offset-2" : ""}
                    ${isCurrent ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-2">
                      <span className="flex items-center justify-center gap-1">
                        <Sparkles size={12} className="fill-white" />
                        Recommandé pour vous
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black uppercase tracking-widest text-center py-2">
                      <span className="flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} className="fill-white" />
                        Votre forfait actuel
                      </span>
                    </div>
                  )}

                  <div>
                    <CardHeader className={`p-8 pb-6 ${plan.popular || isCurrent ? "pt-12" : ""}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-md`}>
                          <Icon size={20} className="text-white" />
                        </div>
                        <CardTitle className="text-xl font-black text-slate-900">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="text-slate-500 font-semibold min-h-[48px]">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 pt-0 space-y-6">
                      <div className="border-b border-slate-100 pb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-950 tracking-tight">{plan.price}</span>
                          {plan.usdPrice !== "Custom" && (
                            <span className="text-sm text-slate-400 font-bold">({plan.usdPrice})</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{plan.period}</span>
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm font-semibold">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                              ${plan.color === "blue" ? "bg-blue-50 text-blue-600" :
                                plan.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                                "bg-emerald-50 text-emerald-600"}`}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>

                  <CardFooter className="p-8 pt-0">
                    {isCurrent ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 disabled:opacity-100 h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-sm border-none"
                      >
                        <ShieldCheck size={16} />
                        Forfait Actuel
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isPending}
                        className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 transition-all cursor-pointer shadow-md
                          ${plan.popular
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-indigo-100 hover:shadow-lg"
                            : isDowngrade
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                      >
                        {isUpgradingThis ? (
                          <span className="flex items-center gap-2">
                            <Clock className="animate-spin" size={16} />
                            Activation...
                          </span>
                        ) : (
                          <>
                            {isDowngrade ? "Passer à ce forfait" : "Activer ce forfait"}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Module comparison table */}
          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-slate-900">Comparatif des modules</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 pr-6 font-black text-slate-600 text-xs uppercase tracking-wider">Module</th>
                    {PLANS.map(p => (
                      <th key={p.id} className={`text-center py-3 px-4 font-black text-xs uppercase tracking-wider
                        ${p.id === currentPlan ? "text-indigo-600" : "text-slate-400"}`}>
                        {p.id === "basic" ? "Basique" : p.id === "pro" ? "Pro" : "Entreprise"}
                        {p.id === currentPlan && <span className="ml-1">✓</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-6 font-semibold text-slate-700">{mod.name}</td>
                      <td className="py-3 px-4 text-center"><ModuleCell val={mod.basic} /></td>
                      <td className="py-3 px-4 text-center"><ModuleCell val={mod.pro} /></td>
                      <td className="py-3 px-4 text-center"><ModuleCell val={mod.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Historique
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-slate-900">Historique des abonnements</CardTitle>
              <CardDescription className="font-semibold text-slate-500">
                Toutes vos transactions et changements de forfait.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-3">
              {BILLING_HISTORY.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm">Forfait {item.plan}</p>
                    <p className="text-xs text-slate-500 font-medium">{item.date} · {item.invoice}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-sm">{item.amount}</p>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black">
                      {item.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 rounded-xl font-bold text-xs gap-1">
                    <FileText size={12} />
                    PDF
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Billing
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "billing" && (
        <div className="space-y-4 max-w-2xl">
          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-slate-900">Informations de facturation</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Établissement", value: school.name },
                  { label: "Identifiant école", value: school.slug },
                  { label: "Forfait actif", value: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) },
                  { label: "Statut", value: currentStatus === "active" ? "Actif ✅" : "Suspendu ❌" },
                  { label: "Prochain renouvellement", value: formattedExpiry },
                  { label: "Jours restants", value: `${daysLeft} jours` },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="font-black text-slate-900 text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-indigo-900 text-sm">Renouvellement automatique</p>
                  <p className="text-xs text-indigo-700 font-medium mt-0.5">
                    Votre abonnement est configuré pour se renouveler automatiquement à l'expiration.
                    Contactez le support pour modifier vos préférences.
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold gap-2"
                onClick={() => setActiveTab("plans")}
              >
                <Zap size={16} />
                Gérer mon forfait
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
              >
                <Bell size={16} />
                Contacter le support
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
