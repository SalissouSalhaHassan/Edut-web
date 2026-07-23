"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, FileText, Share2,
  ChevronRight, Award, BadgeCheck,
  Eye, Printer, FileSpreadsheet, X, Check
} from "lucide-react";
import { BroadsheetData } from "../types";
import { formatRank } from "../utils/calculations";
import { toast } from "sonner";
import { saveTermSummaries } from "../actions/academics.actions";

interface BroadsheetMatrixProps {
  data: BroadsheetData;
  onPrintBulletin: (studentId: number) => void;
  onPrintAll?: () => void;
  onPrintPV: () => void;
  activeFilters: any;
}

export default function BroadsheetMatrix({ data, onPrintBulletin, onPrintAll, onPrintPV, activeFilters }: BroadsheetMatrixProps) {
  const [saving, setSaving] = useState(false);
  const [appreciations, setAppreciations] = useState<Record<number, any>>({});
  const [showAnnualReportModal, setShowAnnualReportModal] = useState(false);
  
  const isHigherEd = ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(activeFilters?.level || "Lycée");

  // Initialize appreciations
  useMemo(() => {
    if (data && data.students) {
      const initial: Record<number, any> = {};
      data.students.forEach((s: any) => {
        const avg = typeof s.average === 'number' && !isNaN(s.average) ? s.average : 0;
        
        // Auto-compute defaults if not previously saved
        let defaultTravail = "-";
        if (avg >= 16) defaultTravail = "Félicitation";
        else if (avg >= 14) defaultTravail = "Bien";
        else if (avg >= 12) defaultTravail = "Encouragement";
        else if (avg >= 10) defaultTravail = "Passable";
        else if (avg >= 8) defaultTravail = "Avertissement";
        else defaultTravail = "Blâme";

        const defaultConduite = (s.conduite && s.conduite > 0) ? s.conduite : (s.behaviorScore ?? 20.0);
        const defaultTab = avg >= 14;

        initial[s.id] = {
          conduite: defaultConduite,
          travail: (s.travail && s.travail !== "-") ? s.travail : defaultTravail,
          tableauHonneur: s.tableauHonneur || defaultTab,
        };
      });
      setAppreciations(initial);
    }
  }, [data]);

  const updateAppreciation = (studentId: number, field: string, value: any) => {
    setAppreciations(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const globalStats = useMemo(() => {
    if (!data || !data.students) return { count: 0, classAvg: 0, passed: 0, failed: 0 };
    const students = data.students;
    const count = students.length;
    const avgSum = students.reduce((acc, s) => acc + (s.average || 0), 0);
    const classAvg = count > 0 ? avgSum / count : 0;
    const passed = students.filter(s => s.average >= 10).length;
    return { count, classAvg, passed, failed: count - passed };
  }, [data]);

  // Compute ranks client-side (sorted by descending average)
  const studentRanks = useMemo(() => {
    if (!data || !data.students) return {};
    const sorted = [...data.students].sort((a, b) => (b.average || 0) - (a.average || 0));
    const ranks: Record<number, number> = {};
    let currentRank = 0;
    let lastAvg = -1;
    sorted.forEach((s, idx) => {
      const avg = s.average || 0;
      if (avg !== lastAvg) currentRank = idx + 1;
      ranks[s.id] = currentRank;
      lastAvg = avg;
    });
    return ranks;
  }, [data]);

  if (!data) {
    return (
      <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-lg">
        <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto mb-4 animate-pulse">
          <Award size={48} className="text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium italic">Chargement des données de la matrice...</p>
      </div>
    );
  }

  const { students, subjects, isCumulative } = data;

  if (students.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-lg">
        <div className="p-6 bg-rose-50 rounded-full w-fit mx-auto mb-4">
          <Eye size={48} className="text-rose-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Aucun élève trouvé</h3>
        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">
          Aucun élève n'est associé à la classe "{activeFilters?.className || 'sélectionnée'}". 
          Vérifiez que le nom de la classe dans le profil des élèves correspond exactement.
        </p>
      </div>
    );
  }

  const handleExportAnnualReportCSV = () => {
    if (!data || !data.students) return;

    const headers = [
      "N°",
      "Noms et Prénoms",
      "Date et lieu de naissance",
      "Matricule",
      "Sexe",
      "Redoublement Antérieur",
      "Moyenne 1er Semestre",
      "Rang 1er Semestre",
      "Moyenne 2ème Semestre",
      "Rang 2ème Semestre",
      "Moyenne Annuelle",
      "Allocataire"
    ];

    const rows = data.students.map((student: any, idx: number) => {
      const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
      const pob = student.lieuNaissance || student.placeOfBirth || "-";
      const dateAndPlace = `${dob} à ${pob}`;

      const s1Summary = student.summaryS1 || student.history?.find((h: any) => h.term?.toLowerCase().includes("1") || h.term?.toLowerCase().includes("première"));
      const s2Summary = student.summaryS2 || student.history?.find((h: any) => h.term?.toLowerCase().includes("2") || h.term?.toLowerCase().includes("deuxième"));

      const s1Avg = typeof s1Summary?.average === 'number' ? s1Summary.average.toFixed(2) : (student.s1Average ? Number(student.s1Average).toFixed(2) : "-");
      const s1Rank = s1Summary?.rank || student.s1Rank || "-";

      const s2Avg = typeof s2Summary?.average === 'number' ? s2Summary.average.toFixed(2) : (student.s2Average ? Number(student.s2Average).toFixed(2) : "-");
      const s2Rank = s2Summary?.rank || student.s2Rank || "-";

      const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
      const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage.toFixed(2) : safeAvg.toFixed(2);

      const redoublement = student.redoublement === true || student.isRepeater === true || student.redoublement === "Oui" ? "Oui" : "Non";
      const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

      return [
        idx + 1,
        `"${(student.name || student.studentName || 'Élève').replace(/"/g, '""')}"`,
        `"${dateAndPlace.replace(/"/g, '""')}"`,
        `"${(student.matricule || '-').replace(/"/g, '""')}"`,
        `"${(student.sexe || student.gender || 'M').replace(/"/g, '""')}"`,
        `"${redoublement}"`,
        `"${s1Avg}"`,
        `"${s1Rank}"`,
        `"${s2Avg}"`,
        `"${s2Rank}"`,
        `"${annualAvg}"`,
        `"${allocataire}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rapport_Récapitulatif_Annuel_${activeFilters?.className || "Classe"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rapport récapitulatif annuel exporté avec succès !");
  };

  const handlePrintAll = async () => {
    if (onPrintAll) {
      onPrintAll();
      return;
    }
    
    // Fallback if prop not provided
    setSaving(true);
    try {
      toast.info(`Génération de ${data.students.length} bulletins...`);
      for (const student of data.students) {
        await onPrintBulletin(student.id);
      }
      toast.success("Impression terminée");
    } catch (err) {
      toast.error("Erreur lors de l'impression groupée");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSummaries = async () => {
    setSaving(true);
    try {
      const summaries = students.map(s => {
        const avg = typeof s.average === 'number' && !isNaN(s.average) ? s.average : 0;
        const computedRank = studentRanks[s.id] || 0;
        const decision = avg >= 10 ? "ADMIS ✅" : "REDOUBLE ❌";
        const app = appreciations[s.id] || {};
        
        return {
          studentId: s.id,
          classId: activeFilters.classId,
          sessionId: activeFilters.sessionId,
          term: activeFilters.period,
          average: avg,
          rank: String(computedRank),
          decision: s.decision || decision,
          conduite: Number(app.conduite) || 0,
          travail: app.travail || "-",
          tableauHonneur: app.tableauHonneur || false,
        };
      });

      const res = await saveTermSummaries(summaries);
      if (res.success) {
        toast.success("Appréciations et décisions enregistrées avec succès !");
      } else {
        toast.error("Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MatrixStatsCard icon={<Award className="text-amber-500" />} label="Élèves" value={globalStats.count.toString()} />
        <MatrixStatsCard icon={<Eye className="text-indigo-500" />} label="Classe" value={`${globalStats.classAvg.toFixed(2)}/20`} />
        <MatrixStatsCard icon={<BadgeCheck className="text-emerald-500" />} label="Admis" value={globalStats.passed.toString()} />
        <MatrixStatsCard icon={<Printer className="text-slate-600" />} label="Non admis" value={globalStats.failed.toString()} />
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-amber-600">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Matrice des Résultats</h3>
            <p className="text-sm text-slate-500 font-medium">{students.length} élèves compilés</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setShowAnnualReportModal(true)} 
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={18} /> Rapport Annuel Officiel
          </Button>
          <Button 
            onClick={handleSaveSummaries}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Download size={18} /> {saving ? "Enregistrement..." : "Enregistrer Appréciations"}
          </Button>
          <Button 
            onClick={onPrintPV} 
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <FileText size={18} /> Version PV (PDF)
          </Button>
          <Button 
            onClick={handlePrintAll} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <Printer size={18} /> Tout imprimer (Bulk)
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1800px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <th className="sticky left-0 z-20 bg-slate-900 px-6 py-6 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">
                  N° | NOM ET PRÉNOMS
                </th>
                
                {/* Behavioral Headers (New) */}
                {!isHigherEd && (
                  <th className="px-4 py-6 text-center border-r border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Comportement</p>
                    <div className="flex justify-center gap-4 mt-2 text-[8px] font-bold text-slate-400 uppercase">
                      <span>Cond.</span>
                      <span>Trav.</span>
                      <span>Tab.</span>
                    </div>
                  </th>
                )}

                {subjects.map((sub) => (
                  <th key={sub.id} className="px-6 py-6 text-center border-r border-slate-700 min-w-[200px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{sub.subjectName}</p>
                    <div className="flex justify-center gap-4 mt-2 text-[8px] font-bold text-slate-400">
                      {isHigherEd ? (
                        <>
                          <span className="text-white">NOTES</span>
                          <span>CRÉDITS</span>
                          <span className="text-indigo-300">MENTION</span>
                          <span className="text-amber-400">RNG</span>
                        </>
                      ) : (
                        <>
                          <span>N1</span>
                          <span>N2</span>
                          <span className="text-white">TOT</span>
                          <span className="text-indigo-300">MOY</span>
                          <span className="text-amber-400">RNG</span>
                        </>
                      )}
                    </div>
                  </th>
                ))}

                {/* Cumulative Headers (New) */}
                {isCumulative && (
                  <>
                    <th className="px-6 py-6 text-center border-r border-slate-700 bg-slate-800/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">1er Semestre</p>
                      <div className="flex justify-center gap-4 mt-2 text-[8px] font-bold text-slate-400">
                        <span>MOY</span>
                        <span>RNG</span>
                      </div>
                    </th>
                    <th className="px-6 py-6 text-center border-r border-slate-700 bg-slate-800/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Annuel</p>
                      <div className="flex justify-center gap-4 mt-2 text-[8px] font-bold text-slate-400">
                        <span>MOY</span>
                        <span>RNG</span>
                      </div>
                    </th>
                  </>
                )}

                <th className="px-8 py-6 text-center bg-slate-800/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Période Actuelle</p>
                  <div className="flex justify-center gap-6 mt-2 text-[8px] font-bold text-slate-400">
                    <span>Σ COEF</span>
                    <span className="text-indigo-300">MOY/20</span>
                    <span className="text-amber-400">RANG</span>
                    <span className="text-emerald-400">DECISION</span>
                  </div>
                </th>
                <th className="px-6 py-6 text-center bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student: any, idx: number) => {
                const t1 = student.history?.find((h: any) => h.term && (h.term.includes("1er") || h.term.toLowerCase().includes("1") || h.term.toLowerCase().includes("première")));
                const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
                const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage : (t1 ? (t1.average + safeAvg) / 2 : safeAvg);
                const computedRank = studentRanks[student.id] || 0;
                const totalStudents = students.length;

                return (
                  <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-6 py-5 border-r border-slate-100 min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 w-6">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{student.name}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter mt-0.5">{student.matricule}</p>
                        </div>
                      </div>
                    </td>

                    {/* Behavior Data */}
                    {!isHigherEd && (
                      <td className="px-2 py-4 text-center border-r border-slate-50 bg-orange-50/10 min-w-[200px]">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            className="w-14 h-7 text-[10px] font-bold text-orange-600 bg-white border border-orange-200 rounded text-center focus:ring-2 focus:ring-orange-400 outline-none"
                            value={appreciations[student.id]?.conduite ?? ""}
                            onChange={(e) => updateAppreciation(student.id, 'conduite', e.target.value)}
                            title="Note de conduite (/20)"
                          />
                          <select
                            className="w-24 h-7 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 rounded px-1 focus:ring-2 focus:ring-slate-400 outline-none"
                            value={appreciations[student.id]?.travail || "-"}
                            onChange={(e) => updateAppreciation(student.id, 'travail', e.target.value)}
                          >
                            <option value="-">-</option>
                            <option value="Félicitation">Félicitation</option>
                            <option value="Encouragement">Encouragement</option>
                            <option value="Tableau d'honneur">Tab. d'honneur</option>
                            <option value="Avertissement">Avertissement</option>
                            <option value="Blâme">Blâme</option>
                          </select>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={appreciations[student.id]?.tableauHonneur || false}
                            onChange={(e) => updateAppreciation(student.id, 'tableauHonneur', e.target.checked)}
                            title="Tableau d'Honneur"
                          />
                        </div>
                      </td>
                    )}

                    {subjects.map((sub) => {
                      const res = student.results[sub.id] || {};
                      return (
                        <td key={sub.id} className="px-4 py-4 text-center border-r border-slate-50">
                          <div className="flex items-center justify-center gap-3">
                            {isHigherEd ? (
                              <>
                                <span className="text-[11px] font-black text-slate-800 w-8">{res.total || "-"}</span>
                                <span className="text-[10px] font-medium text-slate-500 w-6">{sub.coefficient || 1}</span>
                                <span className={`text-[9px] font-black w-14 ${res.moy >= 10 ? 'text-indigo-600' : 'text-rose-600'} uppercase tracking-tighter truncate`} title={res.appreciation || "-"}>
                                  {res.appreciation || "-"}
                                </span>
                                <span className="text-[10px] font-black text-amber-500 w-6">{res.rank || "-"}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-medium text-slate-500 w-6">{res.n1 || "-"}</span>
                                <span className="text-[10px] font-medium text-slate-500 w-6">{res.n2 || "-"}</span>
                                <span className="text-[11px] font-black text-slate-800 w-8">{res.total || "-"}</span>
                                <span className={`text-[11px] font-black w-8 ${res.moy >= 10 ? 'text-indigo-600' : 'text-rose-600'}`}>
                                  {res.moy || "-"}
                                </span>
                                <span className="text-[10px] font-black text-amber-500 w-6">{res.rank || "-"}</span>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Cumulative Data Rows */}
                    {isCumulative && (
                      <>
                        <td className="px-6 py-4 text-center border-r border-slate-50 bg-cyan-50/10">
                          <div className="flex items-center justify-center gap-4 text-[10px] font-black">
                            <span className="text-cyan-600 w-10">{t1?.average?.toFixed(2) || "-"}</span>
                            <span className="text-slate-400 w-8">{t1?.rank || "-"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-50 bg-yellow-50/10">
                          <div className="flex items-center justify-center gap-4 text-[10px] font-black">
                            <span className={`w-10 ${annualAvg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{annualAvg.toFixed(2)}</span>
                            <span className="text-amber-500 w-8">{student.annualRank || "-"}</span>
                          </div>
                        </td>
                      </>
                    )}

                    <td className="px-8 py-4 text-center bg-slate-50/30">
                      <div className="flex items-center justify-center gap-6">
                        <span className="text-xs font-black text-slate-400">
                          {student.totalCoef || "-"}
                        </span>
                        <span className={`text-sm font-black ${safeAvg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {safeAvg.toFixed(2)}
                        </span>
                        <span className="text-xs font-black text-amber-500">
                          {computedRank > 0 ? formatRank(computedRank) : "-"} / {totalStudents}
                        </span>
                        <DecisionBadge decision={safeAvg >= 10 ? "ADMIS ✅" : "REDOUBLE ❌"} />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Button
                        onClick={() => onPrintBulletin(student.id)}
                        className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <BadgeCheck size={16} /> Bulletin
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Annual Report Modal */}
      {showAnnualReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto">
          <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Rapport Récapitulatif Officiel Annuel</h2>
                  <p className="text-sm text-slate-300 font-medium mt-0.5">
                    Classe: <span className="text-amber-400 font-bold">{activeFilters?.className || "N/A"}</span> • {students.length} Élèves inscrits
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExportAnnualReportCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Download size={18} /> Exporter Excel (CSV)
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Printer size={18} /> Imprimer (PDF)
                </Button>
                <button
                  onClick={() => setShowAnnualReportModal(false)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="p-6 md:p-8 overflow-auto flex-1 bg-slate-50/50">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="p-3 border-r border-slate-800 text-center w-12">N°</th>
                      <th className="p-3 border-r border-slate-800">Noms et Prénoms</th>
                      <th className="p-3 border-r border-slate-800">Date et lieu de naissance</th>
                      <th className="p-3 border-r border-slate-800 text-center">Matricule</th>
                      <th className="p-3 border-r border-slate-800 text-center">Sexe</th>
                      <th className="p-3 border-r border-slate-800 text-center">Redoublement Antérieur</th>
                      <th className="p-3 border-r border-slate-800 text-center text-cyan-300">Moyenne 1er Semestre</th>
                      <th className="p-3 border-r border-slate-800 text-center text-cyan-300">Rang 1er Semestre</th>
                      <th className="p-3 border-r border-slate-800 text-center text-indigo-300">Moyenne 2ème Semestre</th>
                      <th className="p-3 border-r border-slate-800 text-center text-indigo-300">Rang 2ème Semestre</th>
                      <th className="p-3 border-r border-slate-800 text-center text-amber-300">Moyenne Annuelle</th>
                      <th className="p-3 text-center">Allocataire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {students.map((student: any, idx: number) => {
                      const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
                      const pob = student.lieuNaissance || student.placeOfBirth || "-";
                      const dateAndPlace = `${dob} à ${pob}`;

                      const s1Summary = student.summaryS1 || student.history?.find((h: any) => h.term?.toLowerCase().includes("1") || h.term?.toLowerCase().includes("première"));
                      const s2Summary = student.summaryS2 || student.history?.find((h: any) => h.term?.toLowerCase().includes("2") || h.term?.toLowerCase().includes("deuxième"));

                      const s1Avg = typeof s1Summary?.average === 'number' ? s1Summary.average.toFixed(2) : (student.s1Average ? Number(student.s1Average).toFixed(2) : "-");
                      const s1Rank = s1Summary?.rank || student.s1Rank || "-";

                      const s2Avg = typeof s2Summary?.average === 'number' ? s2Summary.average.toFixed(2) : (student.s2Average ? Number(student.s2Average).toFixed(2) : "-");
                      const s2Rank = s2Summary?.rank || student.s2Rank || "-";

                      const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
                      const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage.toFixed(2) : safeAvg.toFixed(2);

                      const redoublement = student.redoublement === true || student.isRepeater === true || student.redoublement === "Oui" ? "Oui" : "Non";
                      const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 border-r border-slate-100 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 border-r border-slate-100 font-bold text-slate-900">{student.name || student.studentName || "Élève"}</td>
                          <td className="p-3 border-r border-slate-100 text-slate-600">{dateAndPlace}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-mono font-bold text-indigo-600">{student.matricule || "-"}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-bold">{student.sexe || student.gender || "M"}</td>
                          <td className="p-3 border-r border-slate-100 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${redoublement === "Oui" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {redoublement}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-100 text-center font-bold text-slate-900 bg-cyan-50/20">{s1Avg}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-bold text-cyan-700 bg-cyan-50/20">{s1Rank}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-bold text-slate-900 bg-indigo-50/20">{s2Avg}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-bold text-indigo-700 bg-indigo-50/20">{s2Rank}</td>
                          <td className="p-3 border-r border-slate-100 text-center font-black text-amber-600 text-sm bg-amber-50/30">{annualAvg}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{allocataire}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-medium">
              <p>Rapport récapitulatif généré conformément aux normes pédagogiques officielles.</p>
              <Button onClick={() => setShowAnnualReportModal(false)} variant="outline" className="rounded-xl">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixStatsCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-[1.25rem] p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-50 rounded-xl">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const isAdmis = decision === "ADMIS" || decision === "Passage" || decision.includes("ADMIS");
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
      isAdmis ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
    }`}>
      {decision}
    </span>
  );
}