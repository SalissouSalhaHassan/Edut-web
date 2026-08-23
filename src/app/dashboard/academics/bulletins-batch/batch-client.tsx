"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Printer,
  MessageSquare,
  Bell,
  FileDown,
  Users,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startBulletinBatch, getStudentBulletinData } from "@/domains/academics/actions/bulletin-batch.actions";
import type { BatchStudentResult } from "@/domains/academics/services/bulletin-engine";
import { generateBulletinBlob } from "@/domains/academics/utils/bulletin-generator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission?: string;
  classe?: string;
  educationalLevel?: string;
  phone?: string;
}

interface BulletinBatchClientProps {
  classId: number;
  sessionId?: number;
  periodId?: number;
  schoolId: number;
  period: string;
  className: string;
  session: string;
  branchInfo: any;
  headerConfig: any;
  students: Student[];
}

// ─── Progress Item ────────────────────────────────────────────────────────────

function ProgressItem({ result }: { result: BatchStudentResult }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
        result.success
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
      )}
    >
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <XCircle className="size-4 text-rose-600" />
        )}
        <span className="font-medium">{result.studentName}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {result.success && (
          <>
            {result.whatsappSent && (
              <span className="flex items-center gap-0.5 text-emerald-600">
                <MessageSquare className="size-3" /> WA
              </span>
            )}
            {result.pushSent && (
              <span className="flex items-center gap-0.5 text-blue-600">
                <Bell className="size-3" /> Push
              </span>
            )}
            {result.pdfUrl && (
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-indigo-600 hover:underline"
              >
                <FileDown className="size-3" /> PDF
              </a>
            )}
          </>
        )}
        {!result.success && (
          <span className="text-rose-600 text-xs truncate max-w-[140px]" title={result.error}>
            {result.error ?? "Erreur"}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulletinBatchClient({
  classId,
  sessionId,
  periodId,
  schoolId,
  period,
  className,
  session,
  branchInfo,
  headerConfig,
  students,
}: BulletinBatchClientProps) {
  const [selectedAll, setSelectedAll] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    new Set(students.map((s) => s.id))
  );
  const [mergeIntoPdf, setMergeIntoPdf] = React.useState(true);
  const [sendWhatsapp, setSendWhatsapp] = React.useState(false);
  const [sendPush, setSendPush] = React.useState(false);

  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [currentStudent, setCurrentStudent] = React.useState<string>("");
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState<BatchStudentResult[]>([]);
  const [mergedPdfUrl, setMergedPdfUrl] = React.useState<string | null>(null);
  const [pdfBlobs, setPdfBlobs] = React.useState<{ name: string; blob: Blob }[]>([]);

  const targetStudents = students.filter((s) => selectedIds.has(s.id));

  function toggleAll() {
    if (selectedAll) {
      setSelectedIds(new Set());
      setSelectedAll(false);
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
      setSelectedAll(true);
    }
  }

  function toggleStudent(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleStart() {
    if (targetStudents.length === 0) return;
    setRunning(true);
    setDone(false);
    setResults([]);
    setPdfBlobs([]);
    setProgress(0);

    const blobs: { name: string; blob: Blob }[] = [];
    const batchResults: BatchStudentResult[] = [];
    let generated = 0;
    let failed = 0;

    for (let i = 0; i < targetStudents.length; i++) {
      const s = targetStudents[i];
      setCurrentStudent(s.nomEtudiant);
      setProgress(Math.round(((i) / targetStudents.length) * 100));

      try {
        // Fetch bulletin data for this student directly from server action
        const bulletinData = await getStudentBulletinData(s.id, classId, periodId || 0, schoolId);

        // Generate PDF Blob client-side
        const verifyToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const pdfBlob = await generateBulletinBlob({
          ...bulletinData,
          verifyToken,
          branchInfo,
          headerConfig,
        });

        blobs.push({ name: `Bulletin_${s.nomEtudiant.replace(/\s+/g, "_")}`, blob: pdfBlob });

        batchResults.push({
          studentId: s.id,
          studentName: s.nomEtudiant,
          success: true,
          verifyToken,
        });
        generated++;
      } catch (err: any) {
        batchResults.push({
          studentId: s.id,
          studentName: s.nomEtudiant,
          success: false,
          error: err?.message ?? "Erreur de génération",
        });
        failed++;
      }
    }

    setPdfBlobs(blobs);
    setResults(batchResults);
    setProgress(100);
    setRunning(false);
    setDone(true);
  }

  function printAllSeparately() {
    pdfBlobs.forEach(({ blob }) => {
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      win?.print();
    });
  }

  function downloadAllZip() {
    pdfBlobs.forEach(({ name, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
            Classe : {className} — {period}
          </span>
          <h1 className="text-xl font-bold">Génération & Impression des Bulletins</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {students.length} élèves inscrits · Session : {session}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard/academics/bulletins-batch"
            className="rounded-lg border px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            ← Changer de classe
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Student Selector & Options */}
        <div className="md:col-span-1 space-y-4">
          {/* Options Panel */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-semibold">Options de distribution</h2>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mergeIntoPdf}
                onChange={(e) => setMergeIntoPdf(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Fusionner en un seul PDF (Livret)</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5 text-emerald-600" />
                Notification WhatsApp aux parents
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sendPush}
                onChange={(e) => setSendPush(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1">
                <Bell className="size-3.5 text-blue-600" />
                Notification Push Mobile Élève
              </span>
            </label>
          </div>

          {/* Student List Panel */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Élèves ({targetStudents.length}/{students.length})
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-indigo-600 hover:underline"
              >
                {selectedAll ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate">{s.nomEtudiant}</span>
                  </div>
                  {s.numAdmission && (
                    <span className="text-[11px] font-mono text-slate-400 ml-1 shrink-0">
                      {s.numAdmission}
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              type="button"
              disabled={running || targetStudents.length === 0}
              onClick={handleStart}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none"
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Génération en cours ({progress}%)...
                </>
              ) : (
                <>
                  <Printer className="size-4" />
                  Générer {targetStudents.length} bulletin(s)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Execution Progress & Results */}
        <div className="md:col-span-2 space-y-4">
          {/* Progress Card */}
          {running && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  Traitement de : <span className="underline">{currentStudent}</span>
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Summary Card */}
          {done && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="size-5" />
                  Génération terminée avec succès !
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadAllZip}
                    className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    <FileDown className="size-3.5" /> Télécharger tous les PDF
                  </button>
                  <button
                    onClick={printAllSeparately}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition"
                  >
                    <Printer className="size-3.5" /> Imprimer tout
                  </button>
                </div>
              </div>

              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                {results.filter((r) => r.success).length} généré(s) avec succès ·{" "}
                {results.filter((r) => !r.success).length} échec(s)
              </div>
            </div>
          )}

          {/* Live Progress / Result List */}
          {results.length > 0 && (
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-2 max-h-96 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Détails par élève
              </h3>
              {results.map((res) => (
                <ProgressItem key={res.studentId} result={res} />
              ))}
            </div>
          )}

          {!running && !done && (
            <div className="rounded-xl border border-dashed p-12 text-center text-slate-400 space-y-2">
              <Printer className="size-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">Prêt pour la génération</p>
              <p className="text-xs">
                Sélectionnez les élèves et cliquez sur "Générer" pour lancer le traitement par lot
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
