"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardCheck, 
  GraduationCap, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { toast } from "sonner";
const AcademicFilters = dynamic(() => import("@/domains/academics/components/AcademicFilters"), { ssr: false });
const DevoirEntryGrid = dynamic(() => import("@/domains/academics/components/DevoirEntryGrid"), { ssr: false });
import { getDevoirGrid, saveDevoirGrades } from "@/domains/academics/actions/academics.actions";

import { Sparkles, BrainCircuit, Wand2 } from "lucide-react";
import AITeacherAssistantModal from "@/domains/ai/components/AITeacherAssistantModal";

export default function DevoirEntryPage() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [gridMeta, setGridMeta] = useState<{
    coefficient?: number;
    subjectName?: string;
    className?: string;
    educationalLevel?: string;
  }>({});
  const [showAIModal, setShowAIModal] = useState(false);

  const handleLoad = async (filters: any) => {
    console.log("[DevoirEntry] Loading with filters:", filters);
    setLoading(true);
    setActiveFilters(filters);
    
    try {
      const result: any = await getDevoirGrid({
        classId: filters.classId,
        subjectId: filters.subjectId,
        sessionId: filters.sessionId,
        term: filters.period,
      });
      
      if (result?.data) {
        setStudents(result.data);
        setGridMeta({
          coefficient: result.coefficient,
          subjectName: result.subjectName,
          className: result.className,
          educationalLevel: result.educationalLevel
        });
        toast.success("Grille des devoirs (DS) chargée avec succès.");
      } else if (result?.error) {
        toast.error("Erreur de chargement", { description: result.error });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement de la grille.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any[]) => {
    if (!activeFilters) return;
    
    setLoading(true);
    const toastId = toast.loading("Enregistrement et synchronisation des devoirs en cours...");

    try {
      const payload = data.map(row => ({
        studentId: row.studentId,
        subjectId: activeFilters.subjectId,
        classId: activeFilters.classId,
        sessionId: activeFilters.sessionId,
        term: activeFilters.period,
        devoirs: row.devoirs.map((v: string) => v === "" ? null : parseFloat(v)),
        moyenneDevoirs: row.moyenneDevoirs
      }));

      const result = await saveDevoirGrades(payload);
      if (result?.success) {
        toast.success("Succès de l'enregistrement !", {
          id: toastId,
          description: "Les devoirs (DS), moyennes de matière et bulletins ont été synchronisés avec succès.",
          duration: 5000
        });
      } else {
        toast.error("Erreur d'enregistrement", {
          id: toastId,
          description: result?.error || "Une erreur est survenue lors de l'enregistrement.",
          duration: 5000
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur critique de synchronisation", {
        id: toastId,
        description: err?.message || "Impossible de joindre le serveur.",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0C10] p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/academics/grades">
              <Button variant="ghost" className="rounded-2xl h-14 w-14 p-0 bg-white dark:bg-[#131622] border border-transparent dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <ArrowLeft size={24} className="text-slate-600 dark:text-slate-300" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                  <ClipboardCheck size={20} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Gestion des Devoirs (DS)
                </h1>
                {gridMeta.coefficient && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs rounded-full border border-emerald-500/20">
                    Coeff : {gridMeta.coefficient}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                Saisie détaillée des évaluations continues, calcul des moyennes et synchronisation directe avec les bulletins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAIModal(true)}
              className="h-12 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 text-xs"
            >
              <Wand2 size={16} /> Assistant IA Devoirs 🪄
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AcademicFilters onLoad={handleLoad} loading={loading} />

        {/* Content */}
        <AnimatePresence mode="wait">
          {students.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <DevoirEntryGrid 
                students={students} 
                onSave={handleSave} 
                loading={loading}
                subjectName={gridMeta.subjectName}
                className={gridMeta.className}
                coefficient={gridMeta.coefficient}
                term={activeFilters?.period}
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center bg-white dark:bg-[#131622] rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-full w-fit mx-auto mb-6">
                <GraduationCap size={48} className="text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                Sélectionnez une classe et une matière
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                Choisissez les filtres académiques ci-dessus pour charger la grille de saisie des devoirs.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Teacher Assistant Generator Modal */}
        <AITeacherAssistantModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
        />
      </div>
    </div>
  );
}
