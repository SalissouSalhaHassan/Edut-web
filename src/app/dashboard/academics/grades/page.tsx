"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, LayoutGrid, FileCheck, ClipboardCheck, BarChart3, Sparkles, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const AcademicFilters = dynamic(() => import("@/domains/academics/components/AcademicFilters"), { ssr: false });
const GradesEntryGrid = dynamic(() => import("@/domains/academics/components/GradesEntryGrid"), { ssr: false });
const BroadsheetMatrix = dynamic(() => import("@/domains/academics/components/BroadsheetMatrix"), { ssr: false });
const ResultsReportsPanel = dynamic(() => import("@/domains/academics/components/ResultsReportsPanel"), { ssr: false });

import {
  getGradingGrid,
  getBroadsheetMatrix,
  saveStudentGrades,
  getGradingAppreciations,
  getStudentBulletinData,
  getBatchBulletinData,
} from "@/domains/academics/actions/academics.actions";
import { generateBulletinPDF, generatePVMatrixPDF, generateReleveNotesPDF, generateResultsPedagogicalReportPDF } from "@/domains/academics/utils/bulletin-generator";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { useEffect } from "react";
import { getPedagogicalReportAction } from "@/domains/pedagogie/actions/analytics.actions";
import {
  getResultsWorkflowStatus,
  submitGrades,
  requestGradeCorrection,
  validateGradeControl,
  lockResults,
  publishResults,
  unlockResultsException
} from "@/domains/academics/actions/results-workflow.actions";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";

export default function AcademicResultsPage() {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("entry"); // "entry", "matrix" or "reports"
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [level, setLevel] = useState("Lycée");
  const [gradingScale, setGradingScale] = useState<any[]>([]);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [activeCoef, setActiveCoef] = useState(1);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<any>(null);
  const [isLocal, setIsLocal] = useState(false);
  const [pedagogicalReportData, setPedagogicalReportData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>("BROUILLON");
  const [workflowRow, setWorkflowRow] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction();
        setCurrentUser(user);
      } catch (e) {
        console.warn("Failed to load user in client:", e);
      }
    }
    loadUser();
  }, []);

  const isSuperAdmin = currentUser?.superAdmin === true || currentUser?.superAdmin === 1;
  const isDirecteur = currentUser?.admin === true || currentUser?.role?.roleName?.toLowerCase().includes("directeur");
  const isCenseur = currentUser?.role?.roleName?.toLowerCase().includes("censeur") || currentUser?.role?.roleName?.toLowerCase().includes("responsable") || currentUser?.role?.roleName?.toLowerCase().includes("censeur") || currentUser?.role?.roleName?.toLowerCase().includes("études");
  const isEnseignant = currentUser?.role?.roleName?.toLowerCase().includes("enseignant") || currentUser?.role?.roleName?.toLowerCase().includes("professeur") || currentUser?.role?.roleName?.toLowerCase().includes("teacher");

  useEffect(() => {
    async function loadScale() {
      const res = await getGradingAppreciations();
      const data = ((res as any).data?.data || (res as any).data || []) as any[];
      if (data) setGradingScale(data);
    }
    loadScale();
  }, []);

  useEffect(() => {
    async function loadHeaderConfig() {
      const res = await getDocumentHeaderConfig();
      if (res?.data) {
        setHeaderConfig(res.data);
      }
    }
    loadHeaderConfig();
  }, []);

  // Auto-load matrix data when switching to broadsheet if filters are set but matrix not loaded
  useEffect(() => {
    if ((view === "matrix" || view === "reports") && activeFilters && !matrixData) {
      (async () => {
        setLoading(true);
        try {
          const result = await getBroadsheetMatrix({
            classId: activeFilters.classId,
            sessionId: activeFilters.sessionId,
            term: activeFilters.period,
          });
          if (result?.data) setMatrixData(result.data);
        } catch (err) {
          console.error("[auto-load matrix]", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [view, activeFilters]);

  const handleLoad = async (filters: any) => {
    console.log("[handleLoad] Starting with filters:", filters);
    setLoading(true);
    setLevel(filters.level);
    setActiveFilters(filters);
    // Reset old data
    setStudents([]);
    setMatrixData(null);
    setIsLocal(false);

    const cacheKey = `${filters.classId}-${filters.subjectId}-${filters.sessionId}-${filters.period}`;
    const matrixCacheKey = `matrix-${filters.classId}-${filters.sessionId}-${filters.period}`;

    try {
      // 1. Fetch entry grid and matrix data in parallel
      const [gridResult, matrixResult] = await Promise.all([
        navigator.onLine
          ? getGradingGrid({
              classId: filters.classId,
              subjectId: filters.subjectId,
              sessionId: filters.sessionId,
              term: filters.period,
            }).catch(e => {
              console.warn("Failed to get grading grid from server:", e);
              return null;
            })
          : Promise.resolve(null),
        navigator.onLine
          ? getBroadsheetMatrix({
              classId: filters.classId,
              sessionId: filters.sessionId,
              term: filters.period,
            }).catch(e => {
              console.warn("Failed to get broadsheet matrix from server:", e);
              return null;
            })
          : Promise.resolve(null),
      ]);

      if (gridResult?.data) {
        const studentData = gridResult.data;
        if (Array.isArray(studentData)) {
          setStudents(studentData);
          setLevel(gridResult.level || filters.level);
          setActiveCoef(gridResult.activeCoefficient || 1);
          
          try {
            const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
            await cacheReferenceItems("examResults" as any, [{ key: cacheKey, data: studentData, level: gridResult.level, activeCoef: gridResult.activeCoefficient }], "key");
          } catch (e) {
            console.warn("Failed to cache grading grid locally:", e);
          }
        }
      } else {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedList = await getCachedReferenceItems<any>("examResults" as any);
          const match = cachedList.find((c: any) => c.key === cacheKey);
          if (match) {
            setStudents(match.data);
            setLevel(match.level || filters.level);
            setActiveCoef(match.activeCoef || 1);
            setIsLocal(true);
            toast.info("Affichage des notes locales (hors-ligne).");
          } else {
            toast.warning("Aucune donnée locale en cache pour cette sélection.");
          }
        } catch (e) {
          console.warn("Failed to load cached grading grid:", e);
        }
      }

      if (matrixResult?.data) {
        setMatrixData(matrixResult.data);
        try {
          const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
          await cacheReferenceItems("examResults" as any, [{ key: matrixCacheKey, data: matrixResult.data }], "key");
        } catch (e) {
          console.warn("Failed to cache matrix locally:", e);
        }
      } else {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedList = await getCachedReferenceItems<any>("examResults" as any);
          const match = cachedList.find((c: any) => c.key === matrixCacheKey);
          if (match) {
            setMatrixData(match.data);
            setIsLocal(true);
          }
        } catch (e) {
          console.warn("Failed to load cached matrix:", e);
        }
      }

      // 3. Fetch Pedagogical Report Data if online
      let pedReportResult: any = null;
      const pedReportCacheKey = `pedReport-${filters.classId}-${filters.subjectId}-${filters.sessionId}-${filters.period}`;
      if (navigator.onLine) {
        try {
          pedReportResult = await getPedagogicalReportAction({
            classId: Number(filters.classId),
            subjectId: filters.subjectId !== "All" && filters.subjectId ? Number(filters.subjectId) : undefined,
            sessionId: Number(filters.sessionId),
            period: filters.period,
            level: filters.level
          });
        } catch (e) {
          console.warn("Failed to get pedagogical report data from server:", e);
        }
      }

      if (pedReportResult?.success && pedReportResult.data) {
        setPedagogicalReportData(pedReportResult.data);
        try {
          const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
          await cacheReferenceItems("examResults" as any, [{ key: pedReportCacheKey, data: pedReportResult.data }], "key");
        } catch (e) {
          console.warn("Failed to cache pedagogical report locally:", e);
        }
      } else {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cachedList = await getCachedReferenceItems<any>("examResults" as any);
          const match = cachedList.find((c: any) => c.key === pedReportCacheKey);
          if (match) {
            setPedagogicalReportData(match.data);
          }
        } catch (e) {
          console.warn("Failed to load cached pedagogical report:", e);
        }
      }

      // 4. Fetch active workflow status
      try {
        const wfRes = await getResultsWorkflowStatus({
          sessionId: Number(filters.sessionId),
          period: filters.period,
          classId: Number(filters.classId),
          subjectId: filters.subjectId !== "All" && filters.subjectId ? Number(filters.subjectId) : undefined
        });
        const row = (wfRes as any)?.data?.data || (wfRes as any)?.data;
        if (row && row.status) {
          setWorkflowStatus(row.status);
          setWorkflowRow(row);
        } else {
          setWorkflowStatus("BROUILLON");
          setWorkflowRow(null);
        }
      } catch (e) {
        console.warn("Failed to load results workflow status:", e);
      }
    } catch (err) {
      console.error("[handleLoad] Execution error:", err);
      toast.error("Une erreur critique est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!activeFilters) return;
    if (workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE") {
      toast.error("Modification impossible", {
        description: "Les notes sont verrouillées, publiées ou archivées pour cette période."
      });
      return;
    }
    setLoading(true);
    const resultsToSave = data.map((r: any) => ({
      studentId: r.studentId,
      subjectId: activeFilters.subjectId,
      classId: activeFilters.classId,
      sessionId: activeFilters.sessionId,
      term: activeFilters.period,
      classWorkScore: parseFloat(r.classWork) || 0,
      examScore: parseFloat(r.examNote) || 0,
      totalScore: r.total,
      coefficient: activeCoef,
      weightedScore: r.weighted,
      absences: r.absents,
      observation: r.observation,
      appreciation: r.appreciation,
      rank: r.rank
    }));

    try {
      const res = await saveStudentGrades(resultsToSave);
      if (res.success) {
        toast.success("Résultats enregistrés avec succès !", {
          description: "La grille de notes a été mise à jour dans la base de données.",
        });
      } else {
        toast.error("Erreur lors de l'enregistrement", {
          description: res.error || "Une erreur est survenue lors de la communication avec le serveur.",
        });
      }
    } catch (err) {
      toast.error("Erreur critique", {
        description: "Impossible de joindre le serveur pour sauvegarder les données.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBulletin = async (studentId: number) => {
    if (!activeFilters) return;

    setLoading(true);
    try {
      const response = await getStudentBulletinData(studentId, activeFilters.sessionId, activeFilters.period);
      if (response) {
        if (response.error) {
          toast.error(response.error);
          return;
        }

        const data = response.data;

        if (!data || !data.results || data.results.length === 0) {
          toast.warning("Attention: Aucune note trouvée pour cet élève sur cette période.");
        }
        setPreviewData(data);
        setShowPreview(true);
      }
    } catch (err: any) {
      toast.error("Erreur de chargement", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllBulletins = async () => {
    if (!activeFilters) return;
    
    setLoading(true);
    try {
      const response = await getBatchBulletinData(activeFilters.classId, activeFilters.sessionId, activeFilters.period);
      if (response && response.data) {
        const batchData = response.data as any;
        if (batchData.length === 0) {
          toast.warning("Aucune donnée à imprimer.");
          return;
        }

        toast.success(`Préparation de ${batchData.length} bulletins...`);
        
        for (const studentData of batchData) {
          if (studentData.results && studentData.results.length > 0) {
            await generateBulletinPDF({ ...studentData, headerConfig });
          }
        }
        
        toast.success("Tous les bulletins ont été générés !");
      } else if (response && response.error) {
        toast.error(response.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'impression groupée", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPV = async () => {
    if (!activeFilters || !matrixData) return;
    setLoading(true);
    try {
      const classInfo = activeFilters.className || `Classe_${activeFilters.classId}`;
      await generatePVMatrixPDF(matrixData, { className: classInfo }, activeFilters);
      toast.success("PV généré avec succès !");
    } catch (err: any) {
      toast.error("Erreur d'impression", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportResultsReport = async () => {
    if (!activeFilters) {
      toast.warning("Veuillez charger une classe avant de générer le rapport.");
      return;
    }
    if (!matrixData && students.length === 0) {
      toast.warning("Aucune donnée disponible pour le rapport.");
      return;
    }

    setLoading(true);
    try {
      await generateResultsPedagogicalReportPDF({
        matrixData,
        students,
        filters: activeFilters,
        headerConfig,
        isOffline: isLocal || !navigator.onLine,
      });
      toast.success("Rapport pédagogique généré avec succès !");
    } catch (err: any) {
      toast.error("Erreur PDF", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const hasLoadedData = view === "entry"
    ? students.length > 0
    : view === "reports"
      ? Boolean(matrixData || students.length > 0 || loading)
      : Boolean(matrixData || loading);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[1.5rem] text-white shadow-lg shadow-indigo-200">
            <GraduationCap size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Notes & Résultats
              </h1>
              {isLocal && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse">
                  Données locales
                </span>
              )}
              <Sparkles size={20} className="text-indigo-500" />
              {activeFilters && (
                <span className={`ml-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE"
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                }`}>
                  Statut: {workflowStatus.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-slate-600 font-medium ml-1">
              Gestion académique, saisie des notes et matrice des résultats.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard/academics/devoirs">
            <Button className="h-12 px-6 rounded-xl bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-sm uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm">
              <ClipboardCheck size={18} />
              Saisie des Devoirs (DS)
            </Button>
          </Link>

          <Tabs value={view} onValueChange={setView} className="bg-slate-100/80 p-1.5 rounded-[1.25rem] border border-slate-200">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger
                value="entry"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <LayoutGrid size={16} /> Saisie des Notes
              </TabsTrigger>
              <TabsTrigger
                value="matrix"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <BarChart3 size={16} /> Broadsheet
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="rounded-xl px-5 h-10 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold flex items-center gap-2 text-sm"
              >
                <FileText size={16} /> Rapports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AcademicFilters onLoad={handleLoad} loading={loading} />

      {/* Workflow Status Action Bar */}
      {activeFilters && (
        <div className="bg-white border border-slate-200 p-5 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Circuit Approbation:</span>
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${
              workflowStatus === "BROUILLON" ? "bg-slate-100 text-slate-600 border-slate-200" :
              workflowStatus === "SAISIE_TERMINEE" ? "bg-blue-50 text-blue-600 border-blue-100" :
              workflowStatus === "CONTROLE_PEDAGOGIQUE" ? "bg-amber-50 text-amber-600 border-amber-100" :
              workflowStatus === "CORRECTION_DEMANDEE" ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
              workflowStatus === "VALIDATION_CONSEIL" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
              workflowStatus === "VERROUILLE" ? "bg-red-50 text-red-600 border-red-100 font-bold" :
              workflowStatus === "PUBLIE" ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold" :
              "bg-violet-50 text-violet-600 border-violet-100"
            }`}>
              {workflowStatus.replace("_", " ")}
            </span>
            {workflowRow?.observation && (
              <span className="text-xs text-slate-500 italic max-w-xs truncate" title={workflowRow.observation}>
                ({workflowRow.observation})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 1. Enseignant action */}
            {isEnseignant && (workflowStatus === "BROUILLON" || workflowStatus === "CORRECTION_DEMANDEE") && (
              <Button
                onClick={async () => {
                  if (confirm("Soumettre les notes pour contrôle ?")) {
                    setLoading(true);
                    const res = await submitGrades({
                      sessionId: activeFilters.sessionId,
                      period: activeFilters.period,
                      classId: activeFilters.classId,
                      subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                    });
                    setLoading(false);
                    if (res?.success) {
                      toast.success("Notes soumises avec succès !");
                      setWorkflowStatus("SAISIE_TERMINEE");
                    }
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
              >
                Soumettre les notes
              </Button>
            )}

            {/* 2. Censeur action */}
            {isCenseur && workflowStatus === "SAISIE_TERMINEE" && (
              <>
                <Button
                  onClick={async () => {
                    const obs = prompt("Motif de la demande de correction :");
                    if (obs) {
                      setLoading(true);
                      const res = await requestGradeCorrection({
                        sessionId: activeFilters.sessionId,
                        period: activeFilters.period,
                        classId: activeFilters.classId,
                        subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                        observation: obs
                      });
                      setLoading(false);
                      if (res?.success) {
                        toast.success("Demande de correction transmise.");
                        setWorkflowStatus("CORRECTION_DEMANDEE");
                        setWorkflowRow({ observation: obs });
                      }
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Demander correction
                </Button>
                <Button
                  onClick={async () => {
                    if (confirm("Valider le contrôle pédagogique ?")) {
                      setLoading(true);
                      const res = await validateGradeControl({
                        sessionId: activeFilters.sessionId,
                        period: activeFilters.period,
                        classId: activeFilters.classId,
                        subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                      });
                      setLoading(false);
                      if (res?.success) {
                        toast.success("Contrôle pédagogique validé.");
                        setWorkflowStatus("CONTROLE_PEDAGOGIQUE");
                      }
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Valider le contrôle
                </Button>
              </>
            )}

            {/* 3. Directeur action */}
            {isDirecteur && (workflowStatus === "CONTROLE_PEDAGOGIQUE" || workflowStatus === "VALIDATION_CONSEIL" || workflowStatus === "SAISIE_TERMINEE") && (
              <>
                <Button
                  onClick={async () => {
                    if (confirm("Verrouiller les notes ? (Plus aucune modification possible)")) {
                      setLoading(true);
                      const res = await lockResults({
                        sessionId: activeFilters.sessionId,
                        period: activeFilters.period,
                        classId: activeFilters.classId,
                        subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                      });
                      setLoading(false);
                      if (res?.success) {
                        toast.success("Notes verrouillées.");
                        setWorkflowStatus("VERROUILLE");
                      }
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Verrouiller
                </Button>
                <Button
                  onClick={async () => {
                    if (confirm("Publier les résultats ? (Visibles par les parents et élèves)")) {
                      setLoading(true);
                      const res = await publishResults({
                        sessionId: activeFilters.sessionId,
                        period: activeFilters.period,
                        classId: activeFilters.classId,
                        subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                      });
                      setLoading(false);
                      if (res?.success) {
                        toast.success("Résultats publiés.");
                        setWorkflowStatus("PUBLIE");
                      }
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Publier
                </Button>
              </>
            )}

            {/* 4. Super Admin action */}
            {isSuperAdmin && (workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE") && (
              <Button
                onClick={async () => {
                  if (confirm("Déverrouiller exceptionnellement pour ré-autorisation de saisie ?")) {
                    setLoading(true);
                    const res = await unlockResultsException({
                      sessionId: activeFilters.sessionId,
                      period: activeFilters.period,
                      classId: activeFilters.classId,
                      subjectId: activeFilters.subjectId !== "All" && activeFilters.subjectId ? Number(activeFilters.subjectId) : undefined,
                    });
                    setLoading(false);
                    if (res?.success) {
                      toast.success("Déverrouillage exceptionnel validé.");
                      setWorkflowStatus("BROUILLON");
                      setWorkflowRow(null);
                    }
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-5 rounded-xl text-xs uppercase tracking-wider animate-bounce"
              >
                Déverrouillage exceptionnel
              </Button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {hasLoadedData ? (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {view === "entry" ? (
              <GradesEntryGrid
                students={students}
                gradingScale={gradingScale}
                onSave={handleSave}
                onPrintBulletin={handlePrintBulletin}
                level={level}
                coefficient={activeCoef}
                readOnly={workflowStatus === "VERROUILLE" || workflowStatus === "PUBLIE" || workflowStatus === "ARCHIVE"}
              />
            ) : view === "matrix" ? (
              <BroadsheetMatrix
                data={matrixData}
                onPrintBulletin={handlePrintBulletin}
                onPrintAll={handlePrintAllBulletins}
                onPrintPV={handlePrintPV}
                activeFilters={activeFilters}
                headerConfig={headerConfig}
              />
            ) : (
              <ResultsReportsPanel
                matrixData={matrixData}
                students={students}
                activeFilters={activeFilters}
                isLocal={isLocal}
                loading={loading}
                onPrintPV={handlePrintPV}
                onPrintAll={handlePrintAllBulletins}
                onExportPDF={handleExportResultsReport}
                pedagogicalReportData={pedagogicalReportData}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200"
          >
            <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto mb-4">
              <GraduationCap size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">En attente de chargement</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-md mx-auto">
              Sélectionnez les filtres ci-dessus et cliquez sur "Charger la grille".
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulletin Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl w-[95vw] bg-white p-8 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Aperçu du Bulletin - {previewData?.student?.nomEtudiant}
            </DialogTitle>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 mt-4">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                <div>
                  <p><span className="font-bold">Élève:</span> {previewData.student?.nomEtudiant}</p>
                  <p><span className="font-bold">Matricule:</span> {previewData.student?.numAdmission}</p>
                  <p><span className="font-bold">Classe:</span> {previewData.student?.classe}</p>
                </div>
                <div>
                  <p><span className="font-bold">Période:</span> {previewData.term}</p>
                  <p><span className="font-bold">Moyenne:</span> {previewData.summary?.average?.toFixed(2) || "-"}</p>
                  <p><span className="font-bold">Rang:</span> {previewData.summary?.rank || "-"}</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Discipline</th>
                      <th className="p-2 text-center">Note 1</th>
                      <th className="p-2 text-center">Note 2</th>
                      <th className="p-2 text-center">Total</th>
                      <th className="p-2 text-center">Coef</th>
                      <th className="p-2 text-center">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.results?.map((r: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{r.subject?.subjectName || "Matière"}</td>
                        <td className="p-2 text-center">{r.classWorkScore?.toFixed(2) || "-"}</td>
                        <td className="p-2 text-center">{r.examScore?.toFixed(2) || "-"}</td>
                        <td className="p-2 text-center">{r.totalScore?.toFixed(2) || "-"}</td>
                        <td className="p-2 text-center">{r.coefficient || 1}</td>
                        <td className="p-2 text-center">{r.average?.toFixed(2) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    const isOffline = !navigator.onLine;
                    const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(activeFilters?.level || "Lycée");
                    if (isHigherEd) {
                      generateReleveNotesPDF({ ...previewData, headerConfig, isOffline });
                    } else {
                      generateBulletinPDF({ ...previewData, headerConfig, isOffline });
                    }
                    setShowPreview(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmer et Imprimer (PDF)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
