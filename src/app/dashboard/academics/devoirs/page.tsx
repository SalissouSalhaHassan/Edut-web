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

export default function DevoirEntryPage() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>(null);

  const handleLoad = async (filters: any) => {
    console.log("[DevoirEntry] Loading with filters:", filters);
    setLoading(true);
    setActiveFilters(filters);
    
    try {
      const result = await getDevoirGrid({
        classId: filters.classId,
        subjectId: filters.subjectId,
        sessionId: filters.sessionId,
        term: filters.period,
      });
      
      if (result?.data) {
        setStudents(result.data as unknown as any[]);
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
    const toastId = toast.loading("Enregistrement et ترحيل البيانات en cours... Veuillez patienter.");

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
        toast.success("Succès du ترحيل !", {
          id: toastId,
          description: "Les devoirs (DS) et les moyennes de classe ont été enregistrés et transférés avec succès.",
          duration: 5000
        });
      } else {
        toast.error("Erreur de ترحيل البيانات", {
          id: toastId,
          description: result?.error || "Une erreur est survenue lors de l'enregistrement.",
          duration: 5000
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur critique de ترحيل", {
        id: toastId,
        description: err?.message || "Impossible de joindre le serveur.",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/academics/grades">
              <Button variant="ghost" className="rounded-2xl h-14 w-14 p-0 bg-white shadow-sm hover:bg-slate-50 transition-all">
                <ArrowLeft size={24} className="text-slate-600" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                  <ClipboardCheck size={20} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Gestion des Devoirs (DS)
                </h1>
              </div>
              <p className="text-slate-500 font-medium ml-1">
                Saisie détaillée des évaluations continues et calcul des moyennes de classe.
              </p>
            </div>
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
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 shadow-sm"
            >
              <div className="p-8 bg-slate-50 rounded-full w-fit mx-auto mb-6">
                <GraduationCap size={64} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Aucune donnée chargée</h3>
              <p className="text-slate-400 mt-2">Veuillez sélectionner les filtres et cliquer sur "Charger la grille".</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
