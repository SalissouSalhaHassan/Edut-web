"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, LayoutGrid, FileCheck, ClipboardCheck, BarChart3, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const AcademicFilters = dynamic(() => import("@/domains/academics/components/AcademicFilters"), { ssr: false });
const GradesEntryGrid = dynamic(() => import("@/domains/academics/components/GradesEntryGrid"), { ssr: false });
const BroadsheetMatrix = dynamic(() => import("@/domains/academics/components/BroadsheetMatrix"), { ssr: false });

import {
  getGradingGrid,
  getBroadsheetMatrix,
  saveStudentGrades,
  getGradingAppreciations,
  getStudentBulletinData,
  getBatchBulletinData,
} from "@/domains/academics/actions/academics.actions";
import { generateBulletinPDF, generatePVMatrixPDF, generateReleveNotesPDF } from "@/domains/academics/utils/bulletin-generator";
import { getDocumentHeaderConfig, downloadArabicFontAction } from "@/domains/settings/actions/settings.actions";
import { useEffect } from "react";

export default function AcademicResultsPage() {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("entry"); // "entry" or "matrix"
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
      // Download the Arabic font in the background on the server
      downloadArabicFontAction().catch(console.error);
    }
    loadHeaderConfig();
  }, []);

  // Auto-load matrix data when switching to broadsheet if filters are set but matrix not loaded
  useEffect(() => {
    if (view === "matrix" && activeFilters && !matrixData) {
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

    try {
      // 1. First fetch ONLY the entry grid (smaller data)
      const gridResult = await getGradingGrid({
        classId: filters.classId,
        subjectId: filters.subjectId,
        sessionId: filters.sessionId,
        term: filters.period,
      });

      console.log("[handleLoad] Grid result:", gridResult);

      if (gridResult?.error) {
        toast.error(gridResult.error);
      } else if (gridResult?.data) {
        const studentData = gridResult.data;
        if (Array.isArray(studentData)) {
          setStudents(studentData);
          setLevel((gridResult as any)?.level || filters.level);
          setActiveCoef((gridResult as any)?.activeCoefficient || 1);
        }
      }

      // 2. Fetch the heavy matrix data in the background if needed
      // This won't block the UI showing the grades entry grid
      if (view === "matrix") {
        const matrixResult = await getBroadsheetMatrix({
          classId: filters.classId,
          sessionId: filters.sessionId,
          term: filters.period,
        });
        console.log("[handleLoad] Matrix result:", matrixResult);
        if (matrixResult?.data) {
          setMatrixData(matrixResult.data);
        }
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
              <Sparkles size={20} className="text-indigo-500" />
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
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AcademicFilters onLoad={handleLoad} loading={loading} />

      <AnimatePresence mode="wait">
        {(view === "entry" ? students.length > 0 : (!!matrixData || loading)) ? (
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
              />
            ) : (
              <BroadsheetMatrix
                data={matrixData}
                onPrintBulletin={handlePrintBulletin}
                onPrintAll={handlePrintAllBulletins}
                onPrintPV={handlePrintPV}
                activeFilters={activeFilters}
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
                        <td className="p-2 text-center">{r.weightedScore?.toFixed(2) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(activeFilters?.level || "Lycée");
                    if (isHigherEd) {
                      generateReleveNotesPDF({ ...previewData, headerConfig });
                    } else {
                      generateBulletinPDF({ ...previewData, headerConfig });
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