
"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsReportsPanelProps {
  matrixData?: any;
  students?: any[];
  activeFilters?: any;
  isLocal?: boolean;
  loading?: boolean;
  onPrintPV?: () => void;
  onPrintAll?: () => void;
  onExportPDF?: () => void;
}

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function readAverage(row: any) {
  return Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
}

function readStudentName(row: any) {
  return row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Eleve";
}

function StatCard({ title, value, helper, icon: Icon, tone }: any) {
  const tones: any = {
    indigo: "border-indigo-100 bg-indigo-50/40 text-indigo-600",
    emerald: "border-emerald-100 bg-emerald-50/40 text-emerald-600",
    amber: "border-amber-100 bg-amber-50/40 text-amber-600",
    rose: "border-rose-100 bg-rose-50/40 text-rose-600",
    slate: "border-slate-200 bg-white text-slate-600",
  };

  return (
    <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm print:break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${tones[tone] || tones.slate}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function ResultsReportsPanel({
  matrixData,
  students = [],
  activeFilters,
  isLocal,
  loading,
  onPrintPV,
  onPrintAll,
  onExportPDF,
}: ResultsReportsPanelProps) {
  const rows = useMemo(() => {
    const matrixRows = Array.isArray(matrixData?.students) ? matrixData.students : [];
    return matrixRows.length ? matrixRows : students;
  }, [matrixData, students]);

  const stats = useMemo(() => {
    const averages = rows.map(readAverage).filter((value: number) => value > 0);
    const total = rows.length;
    const evaluated = averages.length;
    const classAverage = evaluated ? averages.reduce((sum: number, value: number) => sum + value, 0) / evaluated : 0;
    const passed = averages.filter((value: number) => value >= 10).length;
    const failed = evaluated - passed;
    const best = averages.length ? Math.max(...averages) : 0;
    const weak = averages.filter((value: number) => value < 10).length;

    return {
      total,
      evaluated,
      classAverage,
      passed,
      failed,
      successRate: evaluated ? (passed / evaluated) * 100 : 0,
      failedRate: evaluated ? (failed / evaluated) * 100 : 0,
      best,
      weak,
    };
  }, [rows]);

  const distribution = useMemo(() => {
    const buckets = [
      { label: "Excellent", range: ">= 16", min: 16, max: 20, color: "bg-emerald-500" },
      { label: "Bien", range: "14 - 15,99", min: 14, max: 15.99, color: "bg-teal-500" },
      { label: "Assez bien", range: "12 - 13,99", min: 12, max: 13.99, color: "bg-indigo-500" },
      { label: "Passable", range: "10 - 11,99", min: 10, max: 11.99, color: "bg-amber-500" },
      { label: "Insuffisant", range: "< 10", min: 0, max: 9.99, color: "bg-rose-500" },
    ];

    return buckets.map((bucket) => {
      const count = rows.filter((row: any) => {
        const average = readAverage(row);
        return average >= bucket.min && average <= bucket.max;
      }).length;
      return { ...bucket, count, percent: stats.evaluated ? (count / stats.evaluated) * 100 : 0 };
    });
  }, [rows, stats.evaluated]);

  const topStudents = useMemo(() => {
    return [...rows]
      .filter((row) => readAverage(row) > 0)
      .sort((a, b) => readAverage(b) - readAverage(a))
      .slice(0, 10);
  }, [rows]);

  const weakStudents = useMemo(() => {
    return [...rows]
      .filter((row) => readAverage(row) > 0 && readAverage(row) < 10)
      .sort((a, b) => readAverage(a) - readAverage(b))
      .slice(0, 10);
  }, [rows]);

  const subjectStats = useMemo(() => {
    const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];
    if (!subjects.length || !rows.length) return [];

    return subjects.map((subject: any) => {
      const values = rows
        .map((row: any) => {
          const result = row?.results?.[subject.id] || row?.results?.[subject.subjectId] || row?.results?.[subject.subjectName];
          return Number(result?.moy ?? result?.average ?? result?.total ?? result?.weightedScore ?? 0) || 0;
        })
        .filter((value: number) => value > 0);
      const average = values.length ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length : 0;
      const passed = values.filter((value: number) => value >= 10).length;
      return {
        name: subject.subjectName || subject.name || "Matiere",
        average,
        evaluated: values.length,
        successRate: values.length ? (passed / values.length) * 100 : 0,
      };
    });
  }, [matrixData, rows]);

  return (
    <div className="space-y-6 print:bg-white" id="results-pedagogical-report">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Rapport pedagogique</p>
                <h2 className="text-2xl font-black text-slate-950">Statistiques des notes et resultats</h2>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Classe: {activeFilters?.className || activeFilters?.classId || "-"} | Periode: {activeFilters?.period || "-"} | Session: {activeFilters?.sessionName || activeFilters?.sessionId || "-"}
              {isLocal ? " | Donnees locales" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest" onClick={() => window.print()} disabled={loading}>
              <Printer size={16} className="mr-2" /> Imprimer
            </Button>
            <Button className="h-11 rounded-xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-700" onClick={onExportPDF} disabled={loading}>
              <Download size={16} className="mr-2" /> PDF Rapport
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest" onClick={onPrintPV} disabled={loading || !matrixData}>
              <BarChart3 size={16} className="mr-2" /> PV Classe
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-black uppercase tracking-widest" onClick={onPrintAll} disabled={loading || !activeFilters}>
              <FileText size={16} className="mr-2" /> Bulletins
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Eleves evalues" value={stats.evaluated} helper={`${stats.total} eleves charges`} icon={Users} tone="indigo" />
        <StatCard title="Moyenne classe" value={numberFormat.format(stats.classAverage)} helper="Sur 20" icon={BarChart3} tone="slate" />
        <StatCard title="Taux de reussite" value={`${numberFormat.format(stats.successRate)}%`} helper={`${stats.passed} admis`} icon={CheckCircle2} tone="emerald" />
        <StatCard title="A remedier" value={stats.weak} helper={`${numberFormat.format(stats.failedRate)}% sous 10/20`} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2 print:break-inside-avoid print:shadow-none">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Distribution</p>
              <h3 className="text-xl font-black text-slate-950">Repartition des moyennes</h3>
            </div>
            <TrendingUp className="text-indigo-500" size={22} />
          </div>
          <div className="space-y-4">
            {distribution.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>{item.label} <span className="text-slate-400">({item.range})</span></span>
                  <span>{item.count} eleves | {numberFormat.format(item.percent)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:break-inside-avoid print:shadow-none">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Synthese</p>
              <h3 className="text-xl font-black text-slate-950">Decision pedagogique</h3>
            </div>
            <Award className="text-amber-500" size={22} />
          </div>
          <div className="space-y-4 text-sm font-bold text-slate-700">
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-emerald-700">
              <span>Meilleure moyenne</span>
              <span>{numberFormat.format(stats.best)}/20</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-indigo-50 p-4 text-indigo-700">
              <span>Admis</span>
              <span>{stats.passed}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-4 text-rose-700">
              <span>Non admis</span>
              <span>{stats.failed}</span>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-700">
              <p className="font-black">Priorite suivi</p>
              <p className="mt-1 text-xs font-bold">Revoir les eleves sous 10/20 et les matieres avec faible taux de reussite.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:break-inside-avoid print:shadow-none">
          <div className="mb-5 flex items-center gap-3">
            <Award className="text-emerald-500" size={22} />
            <h3 className="text-xl font-black text-slate-950">Top eleves</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-black uppercase tracking-widest text-slate-400">
                <tr><th className="py-3">Rang</th><th>Eleve</th><th className="text-right">Moyenne</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topStudents.map((row: any, index: number) => (
                  <tr key={`${readStudentName(row)}-${index}`} className="font-bold text-slate-700">
                    <td className="py-3 text-indigo-600">{index + 1}</td>
                    <td>{readStudentName(row)}</td>
                    <td className="text-right text-emerald-600">{numberFormat.format(readAverage(row))}/20</td>
                  </tr>
                ))}
                {!topStudents.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Aucune note chargee.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:break-inside-avoid print:shadow-none">
          <div className="mb-5 flex items-center gap-3">
            <TrendingDown className="text-rose-500" size={22} />
            <h3 className="text-xl font-black text-slate-950">Eleves a accompagner</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-black uppercase tracking-widest text-slate-400">
                <tr><th className="py-3">N</th><th>Eleve</th><th className="text-right">Moyenne</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weakStudents.map((row: any, index: number) => (
                  <tr key={`${readStudentName(row)}-weak-${index}`} className="font-bold text-slate-700">
                    <td className="py-3 text-rose-600">{index + 1}</td>
                    <td>{readStudentName(row)}</td>
                    <td className="text-right text-rose-600">{numberFormat.format(readAverage(row))}/20</td>
                  </tr>
                ))}
                {!weakStudents.length && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Aucun eleve en dessous de 10/20.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
        <div className="mb-5 flex items-center gap-3">
          <BarChart3 className="text-indigo-500" size={22} />
          <h3 className="text-xl font-black text-slate-950">Analyse par matiere</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="rounded-l-xl p-4">Matiere</th>
                <th className="p-4 text-center">Copies</th>
                <th className="p-4 text-center">Moyenne</th>
                <th className="p-4 text-center">Reussite</th>
                <th className="rounded-r-xl p-4">Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectStats.map((subject: any) => (
                <tr key={subject.name} className="font-bold text-slate-700">
                  <td className="p-4">{subject.name}</td>
                  <td className="p-4 text-center">{subject.evaluated}</td>
                  <td className="p-4 text-center text-indigo-600">{numberFormat.format(subject.average)}/20</td>
                  <td className="p-4 text-center text-emerald-600">{numberFormat.format(subject.successRate)}%</td>
                  <td className="p-4 text-slate-500">{subject.average < 10 ? "Remediation recommandee" : "Niveau acceptable"}</td>
                </tr>
              ))}
              {!subjectStats.length && <tr><td colSpan={5} className="p-8 text-center font-bold text-slate-400">Chargez le Broadsheet pour obtenir l'analyse par matiere.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
