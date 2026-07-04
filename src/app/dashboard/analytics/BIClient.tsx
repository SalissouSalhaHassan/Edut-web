"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldAlert, TrendingDown, Users, Calendar, AlertTriangle, 
  CheckCircle, ArrowRight, UserCheck, Bell, Sparkles, MessageSquare, Info
} from "lucide-react";
import { toast } from "sonner";

interface BIClientProps {
  currentUser: any;
  dropoutAlerts: any[];
  regressionAlerts: any[];
  metrics: {
    highRiskCount: number;
    mediumRiskCount: number;
    regressionCount: number;
    overallAttendanceRate: number;
  };
}

export default function BIClient({
  currentUser,
  dropoutAlerts,
  regressionAlerts,
  metrics
}: BIClientProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dropout" | "regression">("dropout");

  // Mock action to alert parent
  const handleAlertParent = (studentName: string) => {
    toast.success(`Alerte envoyée avec succès aux parents de ${studentName} !`);
  };

  // Heuristics summary
  const totalAlerts = dropoutAlerts.length + regressionAlerts.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 pb-16">
      
      {/* Title Header with Sparkles Icon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-x-12 -translate-y-12 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
              <Sparkles size={10} />
              Module IA & BI
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Analyses Prédictives & Décisions</h1>
          <p className="text-slate-400 text-xs font-semibold">
            Outils d'intelligence artificielle pour anticiper le décrochage et suivre les baisses de performance.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
          <Info size={16} className="text-indigo-400 shrink-0" />
          <p className="text-[11px] font-medium text-slate-300 max-w-[200px] leading-relaxed">
            Les alertes sont générées automatiquement en fonction de l'historique de présence et des notes d'examens.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Dropout Risks */}
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute right-3 top-3 w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <AlertTriangle size={24} className="stroke-[1.5]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risques de Décrochage</p>
          <h4 className="text-3xl font-black text-slate-900 leading-tight mt-3">
            {metrics.highRiskCount} <span className="text-xs text-slate-400 font-bold">élèves critiques</span>
          </h4>
          <p className="text-[10px] font-bold text-slate-500 mt-2">
            dont {metrics.mediumRiskCount} à risque moyen sur les 30 derniers jours.
          </p>
        </div>

        {/* Card 2: Academic Regression */}
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute right-3 top-3 w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <TrendingDown size={24} className="stroke-[1.5]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertes Régression</p>
          <h4 className="text-3xl font-black text-slate-900 leading-tight mt-3">
            {metrics.regressionCount} <span className="text-xs text-slate-400 font-bold">classes cibles</span>
          </h4>
          <p className="text-[10px] font-bold text-slate-500 mt-2">
            Moyenne générale en baisse de &gt; 15% par rapport au trimestre précédent.
          </p>
        </div>

        {/* Card 3: Attendance Rate */}
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute right-3 top-3 w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users size={24} className="stroke-[1.5]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Présence Globale</p>
          <h4 className="text-3xl font-black text-slate-900 leading-tight mt-3">
            {metrics.overallAttendanceRate}%
          </h4>
          <p className="text-[10px] font-bold text-slate-500 mt-2">
            Taux de présence moyen pour l'établissement ce mois-ci.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button 
          onClick={() => setActiveSubTab("dropout")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "dropout" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <ShieldAlert size={16} />
          Risque de Décrochage ({dropoutAlerts.length})
        </button>
        <button 
          onClick={() => setActiveSubTab("regression")}
          className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "regression" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <TrendingDown size={16} />
          Régression des Classes ({regressionAlerts.length})
        </button>
      </div>

      {/* Content Container */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* SUBTAB 1: DROPOUT ALERTS */}
        {activeSubTab === "dropout" && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Élèves à risque de décrochage scolaire</h3>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  ⚠️ Calculé selon le taux d'absentéisme et les absences consécutives récentes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4">Élève</th>
                    <th className="py-4">Classe & Niveau</th>
                    <th className="py-4 text-center">Absences Consécutives</th>
                    <th className="py-4 text-center">Présence Globale (30j)</th>
                    <th className="py-4 text-center">Niveau de Risque</th>
                    <th className="py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dropoutAlerts.length > 0 ? (
                    dropoutAlerts.map((row) => {
                      const isCrit = row.riskLevel === "Critique";
                      const rate = 100 - row.absenceRate;

                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-slate-900 text-sm">{row.nomEtudiant}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">Matricule: {row.numAdmission}</div>
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-slate-800 text-xs">{row.classe || "Non assigné"}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{row.educationalLevel}</div>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 text-xs font-black rounded-xl ${
                              row.consecutiveAbsences >= 3 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"
                            }`}>
                              {row.consecutiveAbsences} jours
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800 text-xs">{rate}%</span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isCrit ? "bg-rose-500" : "bg-amber-500"}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-0.5 border text-[9px] font-black uppercase tracking-widest rounded-full ${
                                isCrit 
                                  ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                              }`}>
                                {row.riskLevel}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">{row.riskScore}% score</span>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleAlertParent(row.nomEtudiant)}
                                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-100 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                                title="Envoyer une alerte WhatsApp/SMS aux parents"
                              >
                                <Bell size={12} />
                                Alerter
                              </button>

                              <Link
                                href={`/dashboard/students/${row.studentId}/profile`}
                                className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                              >
                                Fiche Profil
                                <ArrowRight size={12} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-medium">
                        Aucun élève à risque de décrochage détecté ce mois-ci. Excellent travail !
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: REGRESSION ALERTS */}
        {activeSubTab === "regression" && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900">Régression de performance par classe</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                📉 Matières et classes affichant une baisse de moyenne générale de &gt; 15% entre les deux derniers examens.
              </p>
            </div>

            <div className="space-y-4">
              {regressionAlerts.length > 0 ? (
                regressionAlerts.map((row, idx) => (
                  <div key={idx} className="p-5 bg-amber-50/15 border border-amber-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{row.className}</span>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">
                          -{row.dropPercentage}% Régression
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">{row.subjectName}</p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        Comparaison : {row.previousPeriodName} vs {row.latestPeriodName}
                      </p>
                    </div>

                    {/* Grades Comparison Chart Element */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex gap-4 items-end h-16 px-4 bg-white border border-slate-100 rounded-2xl">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400">{row.previousAverage}/20</span>
                          <div 
                            className="w-4 bg-slate-300 rounded-t-sm"
                            style={{ height: `${(row.previousAverage / 20) * 32}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-bold text-rose-500">{row.latestAverage}/20</span>
                          <div 
                            className="w-4 bg-rose-400 rounded-t-sm"
                            style={{ height: `${(row.latestAverage / 20) * 32}px` }}
                          />
                        </div>
                      </div>

                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl max-w-xs">
                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle size={10} />
                          Action Recommandée
                        </p>
                        <p className="text-[11px] text-indigo-900 font-medium mt-1 leading-relaxed">
                          Lancer une remédiation collective et programmer une séance de renforcement.
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  Aucune régression significative de classe détectée. La performance globale est stable.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
