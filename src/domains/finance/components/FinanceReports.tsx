"use client";

import * as React from "react";
import { FileText, Download, Printer, BarChart2, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassSummary {
  className: string;
  expected: number;
  paid: number;
  unpaid: number;
  count: number;
  rate: number;
}

interface FinanceReportsProps {
  classSummary: ClassSummary[];
  stats: {
    totalExpected: number;
    totalPaid: number;
    totalDebts: number;
    recoveryRate: number;
    countPaid: number;
    countUnpaid: number;
    countPartial: number;
    totalStudents: number;
    revenueMonth: number;
    revenueYear: number;
  };
  isMounted: boolean;
}

export default function FinanceReports({ classSummary, stats, isMounted }: FinanceReportsProps) {
  const fmt = (v: number) => isMounted ? `${Math.round(v).toLocaleString("fr-FR")} CFA` : "—";
  const today = isMounted ? new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  const handlePrint = () => {
    const printContent = document.getElementById("finance-report-content");
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <title>Rapport Financier — ${today}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1e293b; padding: 32px; background: #fff; }
          h1 { font-size: 22px; font-weight: 900; color: #4f46e5; margin-bottom: 4px; }
          h2 { font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 24px; }
          .section-title { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 12px; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
          .card-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
          .card-value { font-size: 16px; font-weight: 900; color: #1e293b; margin-top: 4px; }
          .card-value.green { color: #059669; }
          .card-value.red { color: #e11d48; }
          .card-value.indigo { color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; }
          td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
          .rate-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
          .rate-fill { height: 100%; border-radius: 3px; }
          .footer { margin-top: 40px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>📊 Rapport Financier</h1>
        <h2>Généré le ${today}</h2>

        <div class="section-title">Résumé Global</div>
        <div class="cards">
          <div class="card">
            <div class="card-label">Total Attendu</div>
            <div class="card-value indigo">${fmt(stats.totalExpected)}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Encaissé</div>
            <div class="card-value green">${fmt(stats.totalPaid)}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Impayé</div>
            <div class="card-value red">${fmt(stats.totalDebts)}</div>
          </div>
          <div class="card">
            <div class="card-label">Taux de Recouvrement</div>
            <div class="card-value ${stats.recoveryRate >= 80 ? "green" : stats.recoveryRate >= 50 ? "" : "red"}">${stats.recoveryRate}%</div>
          </div>
          <div class="card">
            <div class="card-label">Élèves Payés</div>
            <div class="card-value green">${stats.countPaid}</div>
          </div>
          <div class="card">
            <div class="card-label">Élèves Partiels</div>
            <div class="card-value">${stats.countPartial}</div>
          </div>
          <div class="card">
            <div class="card-label">Élèves Impayés</div>
            <div class="card-value red">${stats.countUnpaid}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Élèves</div>
            <div class="card-value">${stats.totalStudents}</div>
          </div>
        </div>

        <div class="section-title">Récapitulatif par Classe</div>
        <table>
          <thead>
            <tr>
              <th>Classe</th>
              <th>Élèves</th>
              <th>Attendu (CFA)</th>
              <th>Encaissé (CFA)</th>
              <th>Impayé (CFA)</th>
              <th>Taux</th>
            </tr>
          </thead>
          <tbody>
            ${classSummary.map(cls => `
              <tr>
                <td><strong>${cls.className}</strong></td>
                <td>${cls.count}</td>
                <td>${cls.expected.toLocaleString("fr-FR")}</td>
                <td style="color: #059669; font-weight: 700">${cls.paid.toLocaleString("fr-FR")}</td>
                <td style="color: #e11d48; font-weight: 700">${cls.unpaid.toLocaleString("fr-FR")}</td>
                <td>
                  <div class="rate-bar"><div class="rate-fill" style="width: ${cls.rate}%; background: ${cls.rate >= 80 ? "#10b981" : cls.rate >= 50 ? "#f59e0b" : "#f43f5e"}"></div></div>
                  <small>${cls.rate}%</small>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          Rapport généré automatiquement • ${today} • Système de Gestion Scolaire
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-6" id="finance-report-content">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rapport Financier Complet</p>
          <p className="text-sm font-black text-slate-800 mt-0.5">Exportable en PDF • Mis à jour en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="h-10 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
          >
            <Printer size={14} /> Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Global stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Attendu", value: fmt(stats.totalExpected), color: "indigo", icon: FileText },
          { label: "Total Encaissé", value: fmt(stats.totalPaid), color: "emerald", icon: TrendingUp },
          { label: "Total Impayé", value: fmt(stats.totalDebts), color: "rose", icon: BarChart2 },
          { label: "Taux Recouvrement", value: `${stats.recoveryRate}%`, color: stats.recoveryRate >= 80 ? "emerald" : stats.recoveryRate >= 50 ? "amber" : "rose", icon: BarChart2 },
        ].map((card) => (
          <div key={card.label} className={cn(
            "bg-white rounded-3xl border p-6",
            card.color === "indigo" && "border-indigo-100",
            card.color === "emerald" && "border-emerald-100",
            card.color === "rose" && "border-rose-100",
            card.color === "amber" && "border-amber-100"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
              card.color === "indigo" && "bg-indigo-50 text-indigo-500",
              card.color === "emerald" && "bg-emerald-50 text-emerald-500",
              card.color === "rose" && "bg-rose-50 text-rose-500",
              card.color === "amber" && "bg-amber-50 text-amber-500"
            )}>
              <card.icon size={16} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            <p className={cn(
              "text-lg font-black mt-1",
              card.color === "indigo" && "text-indigo-700",
              card.color === "emerald" && "text-emerald-700",
              card.color === "rose" && "text-rose-700",
              card.color === "amber" && "text-amber-700"
            )}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Class report table */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rapport par Classe</p>
            <p className="text-sm font-black text-slate-800">{classSummary.length} classes • Année scolaire en cours</p>
          </div>
          {isMounted && (
            <span className="ml-auto text-[10px] font-bold text-slate-400">{today}</span>
          )}
        </div>

        {classSummary.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 opacity-30">
            <FileText size={40} />
            <p className="font-black">Aucune donnée disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Classe</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Élèves</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Attendu</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Encaissé</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Impayé</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left min-w-[120px]">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classSummary.map((cls) => (
                  <tr key={cls.className} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-6 rounded-full",
                          cls.rate >= 80 ? "bg-emerald-400" : cls.rate >= 50 ? "bg-amber-400" : "bg-rose-400"
                        )} />
                        <span className="text-[12px] font-black text-slate-800">{cls.className}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[11px] font-bold text-slate-500">{cls.count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-black text-indigo-600">{isMounted ? cls.expected.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-black text-emerald-600">{isMounted ? cls.paid.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-black text-rose-500">{isMounted ? cls.unpaid.toLocaleString("fr-FR") : "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700",
                              cls.rate >= 80 ? "bg-emerald-400" : cls.rate >= 50 ? "bg-amber-400" : "bg-rose-400"
                            )}
                            style={{ width: `${cls.rate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black w-9 text-right",
                          cls.rate >= 80 ? "text-emerald-600" : cls.rate >= 50 ? "text-amber-600" : "text-rose-600"
                        )}>{cls.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">Total Général</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[11px] font-black text-indigo-700">{stats.totalStudents}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-indigo-700">{fmt(stats.totalExpected)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-emerald-700">{fmt(stats.totalPaid)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-rose-600">{fmt(stats.totalDebts)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", stats.recoveryRate >= 80 ? "bg-emerald-400" : stats.recoveryRate >= 50 ? "bg-amber-400" : "bg-rose-400")}
                          style={{ width: `${stats.recoveryRate}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black w-9 text-right",
                        stats.recoveryRate >= 80 ? "text-emerald-600" : stats.recoveryRate >= 50 ? "text-amber-600" : "text-rose-600"
                      )}>{stats.recoveryRate}%</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
