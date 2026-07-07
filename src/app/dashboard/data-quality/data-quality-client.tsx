"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, ShieldCheck, AlertCircle, AlertTriangle, Info,
  CheckCircle, Play, RefreshCw, BarChart2, Check, ArrowRight,
  TrendingUp, HelpCircle, Activity, Sparkles, Building2, User
} from "lucide-react";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { quickFixStudentData, quickFixPaymentReference, quickFixGrade } from "@/domains/reports/actions/reports.actions";

interface DataQualityClientProps {
  unifiedData: {
    students: any[];
    classes: any[];
    subjects: any[];
    employees: any[];
    feePayments: any[];
    expenses: any[];
    attendance: any[];
    seances: any[];
    plans: any[];
    resources: any[];
    courses: any[];
    lessons: any[];
    assignments: any[];
    submissions: any[];
    progress: any[];
    virtualClasses: any[];
    auditLogs: any[];
    grades?: any[];
  };
  branding: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  currentUser: any;
}

interface QualityIssue {
  id: string;
  gravity: "critical" | "warning" | "info";
  module: string;
  recordId: string;
  recordName: string;
  problem: string;
  correction: string;
  status: "pending" | "resolved";
  actionType: "fix_class" | "fix_parent" | "fix_matricule" | "fix_payment_ref" | "fix_grade" | "fix_sync" | "fix_encoding";
  payload: any;
}

export default function DataQualityClient({ unifiedData, branding, currentUser }: DataQualityClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  
  // Real-time Dexie Outbox monitor for unsynced changes
  const outboxItems = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return await localDb.outbox.where("status").anyOf(["pending", "failed"]).toArray();
  }, []) ?? [];

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Run diagnostics
    runDiagnostics();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [unifiedData, outboxItems]);

  const detectEncodingError = (str: string): boolean => {
    if (!str) return false;
    const corruptionPatterns = ["Ã©", "Ã ", "Ã¨", "Ã´", "Ã»", "Ã«", "Ã¯", "Ã¢", "Ã®", "Â", "Ã¦", "Å“"];
    return corruptionPatterns.some(p => str.includes(p));
  };

  const cleanEncoding = (str: string): string => {
    if (!str) return str;
    return str
      .replace(/Ã©/g, "é")
      .replace(/Ã /g, "à")
      .replace(/Ã¨/g, "è")
      .replace(/Ã´/g, "ô")
      .replace(/Ã»/g, "û")
      .replace(/Ã«/g, "ë")
      .replace(/Ã¯/g, "ï")
      .replace(/Ã¢/g, "â")
      .replace(/Ã®/g, "î")
      .replace(/Â/g, "")
      .replace(/Ã¦/g, "æ")
      .replace(/Å“/g, "œ");
  };

  const runDiagnostics = () => {
    const list: QualityIssue[] = [];

    // 1. Students without class
    unifiedData.students.forEach(s => {
      if (!s.classe || s.classe.trim() === "") {
        list.push({
          id: `stu_no_class_${s.id}`,
          gravity: "warning",
          module: "Élèves",
          recordId: s.numAdmission || `ID: ${s.id}`,
          recordName: s.nomEtudiant,
          problem: "Élève non assigné à une classe de l'établissement",
          correction: "Assigner à une classe par défaut (CI / CP)",
          status: resolvedIds.includes(`stu_no_class_${s.id}`) ? "resolved" : "pending",
          actionType: "fix_class",
          payload: s
        });
      }
    });

    // 2. Students without parent info
    unifiedData.students.forEach(s => {
      const hasParent = s.nomPere || s.mobile;
      if (!hasParent) {
        list.push({
          id: `stu_no_parent_${s.id}`,
          gravity: "info",
          module: "Élèves",
          recordId: s.numAdmission || `ID: ${s.id}`,
          recordName: s.nomEtudiant,
          problem: "Informations parents (tuteur) ou numéro de téléphone manquant",
          correction: "Attribuer un contact par défaut (Tuteur inconnu, 000000)",
          status: resolvedIds.includes(`stu_no_parent_${s.id}`) ? "resolved" : "pending",
          actionType: "fix_parent",
          payload: s
        });
      }
    });

    // 3. Duplicate matricules
    const matriculeMap = new Map<string, any[]>();
    unifiedData.students.forEach(s => {
      if (s.numAdmission) {
        const val = s.numAdmission.trim();
        if (!matriculeMap.has(val)) matriculeMap.set(val, []);
        matriculeMap.get(val)!.push(s);
      }
    });
    matriculeMap.forEach((studentsWithMat, mat) => {
      if (studentsWithMat.length > 1) {
        studentsWithMat.forEach((s, idx) => {
          if (idx > 0) { // Keep the first one, flag the rest as duplicates
            list.push({
              id: `stu_dup_mat_${s.id}`,
              gravity: "critical",
              module: "Élèves",
              recordId: s.numAdmissionKey || s.numAdmission,
              recordName: s.nomEtudiant,
              problem: `Matricule en doublon avec un autre élève: ${mat}`,
              correction: "Générer un matricule unique à la suite (Ex: STU-xxxx-DUP)",
              status: resolvedIds.includes(`stu_dup_mat_${s.id}`) ? "resolved" : "pending",
              actionType: "fix_matricule",
              payload: s
            });
          }
        });
      }
    });

    // 4. Payments without reference
    unifiedData.feePayments.forEach(p => {
      if (!p.reference || p.reference.trim() === "") {
        const student = unifiedData.students.find(s => s.id === p.studentId);
        list.push({
          id: `pay_no_ref_${p.id}`,
          gravity: "warning",
          module: "Finances",
          recordId: `Recu ID: ${p.id}`,
          recordName: student ? student.nomEtudiant : `Élève ID ${p.studentId}`,
          problem: `Paiement scolarité d'un montant de ${p.amount.toLocaleString()} CFA sans référence bancaire ou ticket`,
          correction: "Auto-générer une référence unique de caisse",
          status: resolvedIds.includes(`pay_no_ref_${p.id}`) ? "resolved" : "pending",
          actionType: "fix_payment_ref",
          payload: p
        });
      }
    });

    // 5. Incoherent grades (LMS Submissions score or Standard grades)
    const gradesList = unifiedData.grades || [];
    gradesList.forEach(g => {
      const score = g.totalScore;
      if (score !== null && score !== undefined && (score < 0 || score > 20)) {
        const student = unifiedData.students.find(s => s.id === g.studentId);
        list.push({
          id: `grade_inc_${g.id}`,
          gravity: "critical",
          module: "Performance",
          recordId: `Note ID: ${g.id}`,
          recordName: student ? student.nomEtudiant : `Élève ID ${g.studentId}`,
          problem: `Note incohérente : ${score} / 20 (Dépasse l'échelle ou négative)`,
          correction: "Borner la note (Min 0, Max 20)",
          status: resolvedIds.includes(`grade_inc_${g.id}`) ? "resolved" : "pending",
          actionType: "fix_grade",
          payload: g
        });
      }
    });

    // 6. Unsynchronized absences / Outbox items
    outboxItems.forEach(item => {
      const isAbsence = item.targetTable === "attendanceBatches" || item.targetTable === "studentAttendance";
      if (isAbsence && item.status === "failed") {
        list.push({
          id: `outbox_abs_${item.id}`,
          gravity: "warning",
          module: "Assiduité",
          recordId: `Outbox ID: ${item.id}`,
          recordName: "Rapport d'absence",
          problem: "Rapport d'absence hors-ligne ayant échoué à la synchronisation",
          correction: "Forcer la synchronisation avec le serveur",
          status: resolvedIds.includes(`outbox_abs_${item.id}`) ? "resolved" : "pending",
          actionType: "fix_sync",
          payload: item
        });
      }
    });

    // 7. Unvalidated documents generated offline
    outboxItems.forEach(item => {
      if (item.status === "pending") {
        list.push({
          id: `outbox_pend_${item.id}`,
          gravity: "info",
          module: "Météo Sync",
          recordId: `Outbox ID: ${item.id}`,
          recordName: `Action : ${item.actionType} sur ${item.targetTable}`,
          problem: "Document ou modification générée hors-ligne en attente d'envoi",
          correction: "Forcer la synchronisation outbox",
          status: resolvedIds.includes(`outbox_pend_${item.id}`) ? "resolved" : "pending",
          actionType: "fix_sync",
          payload: item
        });
      }
    });

    // 8. Encoding errors in names (Arabic/French)
    unifiedData.students.forEach(s => {
      const hasError = detectEncodingError(s.nomEtudiant) || detectEncodingError(s.nomPere || "") || detectEncodingError(s.lieuNaissance || "");
      if (hasError) {
        list.push({
          id: `stu_enc_err_${s.id}`,
          gravity: "warning",
          module: "Élèves",
          recordId: s.numAdmission || `ID: ${s.id}`,
          recordName: s.nomEtudiant,
          problem: "Caractères accentués ou arabes illisibles (Erreur d'importation encodage)",
          correction: "Nettoyer et remplacer les caractères corrompus (Ex: Ã© -> é)",
          status: resolvedIds.includes(`stu_enc_err_${s.id}`) ? "resolved" : "pending",
          actionType: "fix_encoding",
          payload: s
        });
      }
    });

    setIssues(list);
  };

  const handleFixIssue = async (issue: QualityIssue) => {
    try {
      toast.info("Correction en cours...");

      if (issue.actionType === "fix_class") {
        const student = issue.payload;
        const defaultClass = unifiedData.classes[0]?.className || "CI";
        const res = await quickFixStudentData(student.id, { classe: defaultClass });
        if (res.success) {
          toast.success("Classe assignée avec succès !");
          setResolvedIds([...resolvedIds, issue.id]);
        }
      }

      else if (issue.actionType === "fix_parent") {
        const student = issue.payload;
        const res = await quickFixStudentData(student.id, { nomPere: "Tuteur inconnu", mobile: "00000000" });
        if (res.success) {
          toast.success("Informations parents attribuées !");
          setResolvedIds([...resolvedIds, issue.id]);
        }
      }

      else if (issue.actionType === "fix_matricule") {
        const student = issue.payload;
        const uniqueMat = `${student.numAdmission || "MAT"}-DUP-${Math.floor(Math.random() * 1000)}`;
        const res = await quickFixStudentData(student.id, { numAdmission: uniqueMat });
        if (res.success) {
          toast.success("Matricule unique généré !");
          setResolvedIds([...resolvedIds, issue.id]);
        }
      }

      else if (issue.actionType === "fix_payment_ref") {
        const payment = issue.payload;
        const newRef = `PAY-AUTO-${Math.random().toString(36).substring(7).toUpperCase()}`;
        if (!isOnline) {
          // Register in local outbox queue
          await localDb.outbox.add({
            actionType: "UPDATE",
            targetTable: "feePayments",
            entityId: payment.id,
            payload: { ...payment, reference: newRef },
            status: "pending",
            timestamp: Date.now()
          });
          toast.success("Mise à jour enregistrée localement.");
          setResolvedIds([...resolvedIds, issue.id]);
        } else {
          const res = await quickFixPaymentReference(payment.id, newRef);
          if (res.success) {
            toast.success("Référence de paiement enregistrée !");
            setResolvedIds([...resolvedIds, issue.id]);
          }
        }
      }

      else if (issue.actionType === "fix_grade") {
        const grade = issue.payload;
        const boundedScore = Math.max(0, Math.min(20, grade.totalScore));
        if (!isOnline) {
          await localDb.outbox.add({
            actionType: "UPDATE",
            targetTable: "examResults",
            entityId: grade.id,
            payload: { ...grade, marksObtained: boundedScore },
            status: "pending",
            timestamp: Date.now()
          });
          toast.success("Note bornée localement.");
          setResolvedIds([...resolvedIds, issue.id]);
        } else {
          const res = await quickFixGrade(grade.id, boundedScore);
          if (res.success) {
            toast.success("Note bornée avec succès !");
            setResolvedIds([...resolvedIds, issue.id]);
          }
        }
      }

      else if (issue.actionType === "fix_sync") {
        toast.info("Tentative de synchronisation de la queue...");
        const { syncOutbox } = await import("@/infrastructure/local-db/sync");
        const success = await syncOutbox();
        if (success) {
          toast.success("Synchronisation effectuée !");
          setResolvedIds([...resolvedIds, issue.id]);
        } else {
          toast.warning("Rien à synchroniser ou échec de la connexion.");
        }
      }

      else if (issue.actionType === "fix_encoding") {
        const student = issue.payload;
        const cleanedName = cleanEncoding(student.nomEtudiant);
        const cleanedPere = cleanEncoding(student.nomPere || "");
        const cleanedLieu = cleanEncoding(student.lieuNaissance || "");
        const res = await quickFixStudentData(student.id, {
          nomEtudiant: cleanedName,
          nomPere: cleanedPere,
          lieuNaissance: cleanedLieu
        });
        if (res.success) {
          toast.success("Encodage réparé avec succès !");
          setResolvedIds([...resolvedIds, issue.id]);
        }
      }

    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la tentative de correction");
    }
  };

  const handleFixAll = async () => {
    const pendingIssues = issues.filter(i => i.status === "pending");
    if (pendingIssues.length === 0) return;
    toast.info("Lancement de la correction globale...");
    for (const issue of pendingIssues) {
      await handleFixIssue(issue);
    }
    toast.success("Traitement automatique complété !");
  };

  if (!mounted) return null;

  // Calcul Metrics
  const totalStudents = unifiedData.students.length || 1;
  const criticalCount = issues.filter(i => i.gravity === "critical" && i.status === "pending").length;
  const warningCount = issues.filter(i => i.gravity === "warning" && i.status === "pending").length;
  const incompleteCount = issues.filter(i => i.gravity === "info" && i.status === "pending").length;
  
  // Taux de qualité : dynamic score calculation
  const totalAnomalies = criticalCount + warningCount + incompleteCount;
  const score = Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 5 + warningCount * 1.5 + incompleteCount * 0.5))));

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm shrink-0">
            <ShieldAlert size={26} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Data Quality Center</h1>
              <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100/60 px-3 py-1 rounded-full shadow-sm">
                Diagnostic & Nettoyage
              </span>
            </div>
            <p className="text-slate-500 mt-1.5 font-medium text-sm">
              Analyse et correction automatique des anomalies de la base de données de {branding.name}.
            </p>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-12 px-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw size={14} /> Analyser à nouveau
        </button>
      </div>

      {/* ─── QUALITY METRICS SUMMARY ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Quality Score */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-6 flex items-center justify-between col-span-1 md:col-span-2">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de qualité global</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{score}%</span>
              <span className="text-xs font-bold text-slate-500">de conformité</span>
            </div>
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-400" : "bg-rose-500"}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${score >= 90 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {score >= 90 ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
          </div>
        </div>

        {/* Critical Errors */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Erreurs critiques</p>
          <h4 className="text-3xl font-black text-rose-600 mt-2">{criticalCount}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-1">À corriger d'urgence</p>
        </div>

        {/* Warnings */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avertissements</p>
          <h4 className="text-3xl font-black text-amber-500 mt-2">{warningCount}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Incohérences de données</p>
        </div>

        {/* Incomplete */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Données Incomplètes</p>
          <h4 className="text-3xl font-black text-blue-500 mt-2">{incompleteCount}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Champs secondaires vides</p>
        </div>
      </div>

      {/* ─── DATA CLEANING BUTTON ─── */}
      {issues.filter(i => i.status === "pending").length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 backdrop-blur-sm rounded-[2rem] border border-emerald-100/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
              ✨ Correction en Bloc & Nettoyage Automatique
            </h4>
            <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
              Corrigez d'un seul clic toutes les anomalies détectables (bornage des notes, nettoyage de l'encodage des noms et génération de références manquantes).
            </p>
          </div>
          <button
            onClick={handleFixAll}
            className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 shrink-0 flex items-center gap-2 transition-all duration-300"
          >
            🚀 Lancer la correction automatique ({issues.filter(i => i.status === "pending").length})
          </button>
        </div>
      )}

      {/* ─── DIAGNOSTIC DETAILED TABLE ─── */}
      <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 mb-2">
          <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-600" />
            Liste détaillée des anomalies détectées ({issues.filter(i => i.status === "pending").length})
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">🎉</div>
            <p className="text-slate-800 font-black text-base">Aucune anomalie détectée !</p>
            <p className="text-slate-400 font-bold text-xs">Félicitations, les données de votre établissement sont parfaitement saines.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold text-slate-700 min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-400">
                  <th className="p-4">Gravité</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Identifiant / Élève</th>
                  <th className="p-4">Problème</th>
                  <th className="p-4">Correction Proposée</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {issues.map((issue) => (
                  <tr key={issue.id} className={`hover:bg-slate-50/50 ${issue.status === "resolved" ? "opacity-40" : ""}`}>
                    
                    {/* Gravité */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        issue.gravity === "critical" ? "bg-rose-50 text-rose-600" :
                        issue.gravity === "warning" ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      }`}>
                        {issue.gravity === "critical" ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
                        {issue.gravity}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="p-4 font-black text-slate-900">{issue.module}</td>

                    {/* Identifiant */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-slate-500 font-medium">{issue.recordId}</p>
                        <p className="text-slate-900">{issue.recordName}</p>
                      </div>
                    </td>

                    {/* Problème */}
                    <td className="p-4 text-slate-600 max-w-xs leading-relaxed font-semibold">{issue.problem}</td>

                    {/* Correction */}
                    <td className="p-4 text-indigo-600 font-medium max-w-xs leading-relaxed">{issue.correction}</td>

                    {/* Statut */}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        issue.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {issue.status === "resolved" ? "Corrigé" : "À traiter"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 text-right">
                      {issue.status === "resolved" ? (
                        <span className="inline-flex items-center justify-center size-7 rounded-full bg-emerald-50 text-emerald-600 font-black">
                          ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleFixIssue(issue)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                          Corriger
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
