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
import { startBulletinBatch } from "@/domains/academics/actions/bulletin-batch.actions";
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
  getBulletinDataForStudent: (studentId: number) => Promise<any>;
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
  getBulletinDataForStudent,
}: BulletinBatchClientProps) {
  const [selectedAll, setSelectedAll] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    new Set(students.map((s) => s.id))
  );
  const [mergeIntoPdf, setMergeIntoPdf] = React.useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = React.useState(true);
  const [notifyPush, setNotifyPush] = React.useState(true);
  const [uploadToStorage, setUploadToStorage] = React.useState(true);

  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentStudent, setCurrentStudent] = React.useState<string>("");
  const [results, setResults] = React.useState<BatchStudentResult[]>([]);
  const [summary, setSummary] = React.useState<{ generated: number; failed: number } | null>(null);
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
        // Fetch bulletin data for this student
        const bulletinData = await getBulletinDataForStudent(s.id);

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

      setResults([...batchResults]);
    }

    // After all generated client-side, also call server for storage + notifications
    if (uploadToStorage || notifyWhatsapp || notifyPush) {
      // Server-side batch for storage + distribution (uses server actions)
      // We pass only successful IDs to avoid re-generating
      try {
        const serverBatch = await startBulletinBatch(
          targetStudents
            .filter((s) => batchResults.find((r) => r.studentId === s.id)?.success)
            .map((s) => ({ studentId: s.id, student: s })),
          {
            classId,
            periodId,
            sessionId,
            schoolId,
            period,
            mergeIntoPdf,
            uploadToStorage,
            notifyWhatsapp,
            notifyPush,
            generatedBy: "Batch UI",
          }
        );

        // Merge server results (pdfUrl, whatsapp, push)
        setResults((prev) =>
          prev.map((r) => {
            const serverResult = serverBatch.results.find((sr) => sr.studentId === r.studentId);
            if (!serverResult) return r;
            return {
              ...r,
              pdfUrl: serverResult.pdfUrl,
              whatsappSent: serverResult.whatsappSent,
              pushSent: serverResult.pushSent,
            };
          })
        );
      } catch (serverErr) {
        console.warn("[BulletinBatch] Server distribution error:", serverErr);
      }
    }

    setPdfBlobs(blobs);
    setSummary({ generated, failed });
    setProgress(100);
    setRunning(false);
    setDone(true);
  }

  function handleDownloadAll() {
    for (const { name, blob } of pdfBlobs) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function handlePrintAll() {
    for (const { blob } of pdfBlobs) {
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      win?.print();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🖨️ Impression Groupée des Bulletins
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Classe: <span className="font-semibold text-slate-700">{className}</span> ·{" "}
            Période: <span className="font-semibold text-slate-700">{period}</span> ·{" "}
            Année: <span className="font-semibold text-slate-700">{session}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <Users className="size-4" />
          {students.length} élèves
        </div>
      </div>

      {/* Student Selection */}
      {!running && !done && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Sélection des élèves</h2>
            <button
              onClick={toggleAll}
              className="text-sm text-indigo-600 hover:underline"
            >
              {selectedAll ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {students.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                  selectedIds.has(s.id)
                    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleStudent(s.id)}
                  className="accent-indigo-600"
                />
                <span className="truncate">{s.nomEtudiant}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {selectedIds.size} / {students.length} élève(s) sélectionné(s)
          </p>
        </div>
      )}

      {/* Options */}
      {!running && !done && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Options de distribution</h2>
          <div className="space-y-2">
            {[
              { key: "mergeIntoPdf", label: "Fusionner en un seul PDF pour impression", value: mergeIntoPdf, set: setMergeIntoPdf, icon: "🖨️" },
              { key: "uploadToStorage", label: "Sauvegarder dans le registre officiel (Cloud)", value: uploadToStorage, set: setUploadToStorage, icon: "☁️" },
              { key: "notifyWhatsapp", label: "Envoyer via WhatsApp aux parents", value: notifyWhatsapp, set: setNotifyWhatsapp, icon: "💬" },
              { key: "notifyPush", label: "Notification Push dans l'application", value: notifyPush, set: setNotifyPush, icon: "🔔" },
            ].map(({ key, label, value, set, icon }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => set(!value)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    value ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                      value ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {icon} {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {!running && !done && (
        <button
          onClick={handleStart}
          disabled={selectedIds.size === 0}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white transition-all",
            selectedIds.size > 0
              ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200"
              : "bg-slate-300 cursor-not-allowed"
          )}
        >
          <Printer className="size-5" />
          Lancer la génération ({selectedIds.size} bulletins)
        </button>
      )}

      {/* Progress */}
      {running && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-indigo-600" />
            <div>
              <p className="font-semibold">Génération en cours...</p>
              <p className="text-sm text-slate-500">Élève actuel: {currentStudent}</p>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 text-right">{progress}%</p>
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {results.map((r) => (
                <ProgressItem key={r.studentId} result={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {done && summary && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{summary.generated}</p>
              <p className="text-sm text-emerald-700 mt-1">Générés</p>
            </div>
            <div className="rounded-xl border bg-rose-50 dark:bg-rose-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-rose-600">{summary.failed}</p>
              <p className="text-sm text-rose-700 mt-1">Échecs</p>
            </div>
            <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {results.filter((r) => r.whatsappSent).length}
              </p>
              <p className="text-sm text-blue-700 mt-1">WhatsApp envoyés</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownloadAll}
              disabled={pdfBlobs.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-300 py-3 text-indigo-700 font-medium hover:bg-indigo-50 transition-colors"
            >
              <FileDown className="size-4" />
              Télécharger ({pdfBlobs.length} PDF)
            </button>
            <button
              onClick={handlePrintAll}
              disabled={pdfBlobs.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              <Printer className="size-4" />
              Imprimer tout
            </button>
          </div>

          {/* Detailed Results */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 space-y-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Détail par élève</h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {results.map((r) => (
                <ProgressItem key={r.studentId} result={r} />
              ))}
            </div>
          </div>

          {/* Start New Batch */}
          <button
            onClick={() => {
              setDone(false);
              setResults([]);
              setSummary(null);
              setPdfBlobs([]);
            }}
            className="w-full py-3 text-center text-slate-600 hover:text-slate-900 text-sm underline"
          >
            Nouvelle génération
          </button>
        </div>
      )}
    </div>
  );
}
