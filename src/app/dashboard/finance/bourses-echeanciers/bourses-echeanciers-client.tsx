"use client";

import React, { useState, useTransition } from "react";
import { 
  Award, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Search, 
  FileDown, 
  Send, 
  Trash2, 
  Edit3, 
  Clock, 
  Building2, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  saveScholarship, 
  deleteScholarship, 
  assignScholarshipToStudent, 
  deleteStudentScholarship,
  generateStudentPaymentSchedule,
  recordSchedulePayment,
  triggerScheduleReminder,
  ScholarshipInput,
  StudentScholarshipAssignInput
} from "@/domains/finance/actions/bourses-echeanciers.actions";
import { 
  generateAttestationBoursePDF, 
  generateEcheancierPaiementPDF, 
  ScholarshipAttestationParams, 
  PaymentSchedulePDFParams 
} from "@/domains/finance/utils/bourses-echeancier-pdf-generator";

interface StudentOption {
  id: number;
  nom: string;
  matricule: string;
  classe?: string | null;
}

export function BoursesEcheanciersClient({
  initialData,
  studentsList,
}: {
  initialData: any;
  studentsList: StudentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"bourses" | "echeanciers" | "catalogue">("bourses");
  const [search, setSearch] = useState("");

  // Modals
  const [isNewBourseModal, setIsNewBourseModal] = useState(false);
  const [isAssignModal, setIsAssignModal] = useState(false);
  const [isGenerateScheduleModal, setIsGenerateScheduleModal] = useState(false);
  const [isPayModal, setIsPayModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  // Form states - Scholarship
  const [bName, setBName] = useState("");
  const [bProvider, setBProvider] = useState("Ministère de l'Enseignement Supérieur");
  const [bType, setBType] = useState("Pourcentage");
  const [bDiscount, setBDiscount] = useState(50);
  const [bAppliesTo, setBAppliesTo] = useState("Frais de Scolarité");

  // Form states - Assign
  const [assignStudentId, setAssignStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [assignScholarshipId, setAssignScholarshipId] = useState<number>(initialData.scholarships[0]?.id || 0);
  const [assignDiscount, setAssignDiscount] = useState<number>(50);
  const [assignRef, setAssignRef] = useState(`DEC-BRS-${Date.now().toString().slice(-4)}`);

  // Form states - Schedule Generator
  const [schedStudentId, setSchedStudentId] = useState<number>(studentsList[0]?.id || 0);
  const [schedGross, setSchedGross] = useState<number>(700000);
  const [schedDiscount, setSchedDiscount] = useState<number>(50);
  const [schedMonths, setSchedMonths] = useState<number>(9);

  const m = initialData.metrics;

  // Filter allocations
  const filteredAllocations = (initialData.allocations || []).filter((a: any) => {
    const term = search.toLowerCase();
    return (
      (a.studentNom || "").toLowerCase().includes(term) ||
      (a.studentMatricule || "").toLowerCase().includes(term) ||
      (a.scholarshipName || "").toLowerCase().includes(term)
    );
  });

  // Filter schedules
  const filteredSchedules = (initialData.schedules || []).filter((s: any) => {
    const term = search.toLowerCase();
    return (
      (s.studentNom || "").toLowerCase().includes(term) ||
      (s.studentMatricule || "").toLowerCase().includes(term) ||
      (s.label || "").toLowerCase().includes(term)
    );
  });

  const handleSaveScholarship = () => {
    if (!bName) {
      toast.error("Nom de la bourse requis");
      return;
    }
    startTransition(async () => {
      const res = await saveScholarship({
        name: bName,
        provider: bProvider,
        type: bType,
        discountValue: Number(bDiscount),
        appliesTo: bAppliesTo,
        academicYear: "2025-2026",
      });
      if (res.success) {
        toast.success("Bourse ajoutée au catalogue");
        setIsNewBourseModal(false);
        setBName("");
        router.refresh();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    });
  };

  const handleAssignScholarship = () => {
    if (!assignStudentId || !assignScholarshipId) {
      toast.error("Étudiant et Bourse requis");
      return;
    }
    startTransition(async () => {
      const res = await assignScholarshipToStudent({
        studentId: Number(assignStudentId),
        scholarshipId: Number(assignScholarshipId),
        customDiscountPercentage: Number(assignDiscount),
        decisionReference: assignRef,
        academicYear: "2025-2026",
      });
      if (res.success) {
        toast.success("Bourse attribuée avec succès");
        setIsAssignModal(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de l'attribution");
      }
    });
  };

  const handleGenerateSchedule = () => {
    if (!schedStudentId) {
      toast.error("Veuillez sélectionner un étudiant");
      return;
    }
    startTransition(async () => {
      const res = await generateStudentPaymentSchedule(
        Number(schedStudentId),
        Number(schedGross),
        Number(schedDiscount),
        Number(schedMonths)
      );
      if (res.success) {
        toast.success(`Échéancier généré (${res.count} mensualités)`);
        setIsGenerateScheduleModal(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de la génération");
      }
    });
  };

  const handleRecordPayment = () => {
    if (!selectedSchedule || payAmount <= 0) {
      toast.error("Montant de règlement invalide");
      return;
    }
    startTransition(async () => {
      const res = await recordSchedulePayment(selectedSchedule.id, Number(payAmount));
      if (res.success) {
        toast.success("Paiement enregistré avec succès");
        setIsPayModal(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    });
  };

  const handleSendReminder = (schedId: number) => {
    startTransition(async () => {
      const res = await triggerScheduleReminder(schedId);
      if (res.success) {
        toast.success("Relance envoyée par SMS / WhatsApp");
        router.refresh();
      }
    });
  };

  const handleExportAttestation = async (alloc: any) => {
    try {
      const gross = 700000;
      const deduction = Number(alloc.allocatedAmount || (gross * (alloc.customDiscountPercentage || 50)) / 100);
      const net = gross - deduction;

      const payload: ScholarshipAttestationParams = {
        student: {
          id: alloc.studentId,
          nom: alloc.studentNom || "Étudiant",
          matricule: alloc.studentMatricule || `EDUT-${alloc.studentId}`,
          classe: alloc.studentClasse || "Licence",
        },
        scholarship: {
          name: alloc.scholarshipName || "Bourse d'État",
          provider: alloc.scholarshipProvider || "Ministère de l'Enseignement Supérieur",
          type: alloc.scholarshipType || "Pourcentage",
          discountValue: alloc.customDiscountPercentage || 50,
          allocatedAmount: deduction,
          academicYear: alloc.academicYear || "2025-2026",
          decisionReference: alloc.decisionReference,
          decisionDate: alloc.decisionDate ? String(alloc.decisionDate) : undefined,
        },
        financialSummary: {
          totalGrossTuition: gross,
          scholarshipDeduction: deduction,
          netPayableTuition: net,
          currency: "FCFA",
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          city: "Niamey",
        },
      };

      await generateAttestationBoursePDF(payload);
      toast.success("Attestation de bourse générée");
    } catch (e) {
      toast.error("Erreur lors de la génération de l'attestation");
    }
  };

  const handleExportEcheancier = async (studentId: number, studentNom: string, matricule: string) => {
    try {
      const studentSchedules = (initialData.schedules || []).filter((s: any) => s.studentId === studentId);
      const schedList = studentSchedules.length > 0 ? studentSchedules : [
        { installmentNumber: 1, label: "Mensualité Octobre 2025", dueDate: "2025-10-05", grossAmount: 77777, scholarshipDeduction: 38888, netAmount: 38888, paidAmount: 38888, balance: 0, status: "Payé" },
        { installmentNumber: 2, label: "Mensualité Novembre 2025", dueDate: "2025-11-05", grossAmount: 77777, scholarshipDeduction: 38888, netAmount: 38888, paidAmount: 0, balance: 38888, status: "En retard" },
        { installmentNumber: 3, label: "Mensualité Décembre 2025", dueDate: "2025-12-05", grossAmount: 77777, scholarshipDeduction: 38888, netAmount: 38888, paidAmount: 0, balance: 38888, status: "À échoir" },
      ];

      const totGross = schedList.reduce((a: number, c: any) => a + Number(c.grossAmount), 0);
      const totSch = schedList.reduce((a: number, c: any) => a + Number(c.scholarshipDeduction), 0);
      const totNet = schedList.reduce((a: number, c: any) => a + Number(c.netAmount), 0);
      const totPaid = schedList.reduce((a: number, c: any) => a + Number(c.paidAmount), 0);
      const totBal = totNet - totPaid;

      const payload: PaymentSchedulePDFParams = {
        student: {
          id: studentId,
          nom: studentNom || "Étudiant",
          matricule: matricule || `EDUT-${studentId}`,
          classe: "Licence",
        },
        academicYear: "2025-2026",
        currency: "FCFA",
        schedules: schedList,
        summary: {
          totalGross: totGross,
          totalScholarship: totSch,
          totalNet: totNet,
          totalPaid: totPaid,
          totalBalance: totBal,
        },
        institution: {
          name: "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES",
          countryName: "RÉPUBLIQUE DU NIGER",
          ministryName: "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE",
          city: "Niamey",
        },
      };

      await generateEcheancierPaiementPDF(payload);
      toast.success("Échéancier de paiement généré");
    } catch (e) {
      toast.error("Erreur lors de la génération de l'échéancier");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Bourses, Exonérations &amp; Échéanciers
              </h1>
              <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                Gestion Financière &amp; Recouvrement
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Contrôle des bourses d'État et d'excellence, calcul automatique du Net à Payer et suivi des échéances mensuelles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsAssignModal(true)}
            className="h-11 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 shadow-md shadow-amber-500/20"
          >
            <Award className="h-4 w-4" />
            Attribuer une Bourse
          </Button>

          <Button
            onClick={() => setIsGenerateScheduleModal(true)}
            className="h-11 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-indigo-500/20"
          >
            <Calendar className="h-4 w-4" />
            Générer Échéancier
          </Button>
        </div>
      </div>

      {/* ─── 4 MAIN KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Étudiants Boursiers</p>
            <span className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{m.boursiersCount}</p>
          <p className="text-[11px] font-bold text-amber-600 mt-1">Bourses &amp; Exonérations actives</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Volume Bourses Allouées</p>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{m.totalAllocatedBourses.toLocaleString()} <span className="text-xs font-bold text-slate-400">FCFA</span></p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">Déductions totales appliquées</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impayés &amp; Retards</p>
            <span className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{m.totalOverdueSchedules.toLocaleString()} <span className="text-xs font-bold text-slate-400">FCFA</span></p>
          <p className="text-[11px] font-bold text-rose-500 mt-1">Échéances échues non réglées</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux de Recouvrement</p>
            <span className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{m.recoveryRate}%</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">{m.totalPaidSchedules.toLocaleString()} FCFA encaissés</p>
        </div>
      </div>

      {/* ─── TAB NAVIGATION & SEARCH ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("bourses")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "bourses" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              🎓 Boursiers Actifs ({filteredAllocations.length})
            </button>
            <button
              onClick={() => setActiveTab("echeanciers")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "echeanciers" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              📅 Échéanciers &amp; Impayés ({filteredSchedules.length})
            </button>
            <button
              onClick={() => setActiveTab("catalogue")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "catalogue" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              🏛️ Types de Bourses ({initialData.scholarships.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher étudiant, bourse..."
              className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>
        </div>

        {/* ─── TAB 1: BOURSIERS ─── */}
        {activeTab === "bourses" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Étudiant</th>
                  <th className="py-3.5 px-5">Bourse Attribuée</th>
                  <th className="py-3.5 px-5 text-center">Taux Exonération</th>
                  <th className="py-3.5 px-5 text-center">Montant Déduit</th>
                  <th className="py-3.5 px-5 text-center">Réf. Décision</th>
                  <th className="py-3.5 px-5 text-center">Statut</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredAllocations.map((alloc: any) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-900 dark:text-white">{alloc.studentNom}</p>
                      <p className="text-[10px] text-slate-400">{alloc.studentMatricule} • {alloc.studentClasse || "Licence"}</p>
                    </td>

                    <td className="py-4 px-5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{alloc.scholarshipName}</p>
                      <p className="text-[10px] text-slate-400">{alloc.scholarshipProvider}</p>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {alloc.customDiscountPercentage || 50} %
                      </span>
                    </td>

                    <td className="py-4 px-5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      - {Number(alloc.allocatedAmount || 350000).toLocaleString()} FCFA
                    </td>

                    <td className="py-4 px-5 text-center font-mono text-[11px] text-slate-500">
                      {alloc.decisionReference || "N/A"}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200">
                        {alloc.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportAttestation(alloc)}
                          className="h-8 px-2.5 rounded-xl text-[10px] font-black text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 gap-1"
                          title="Générer l'Attestation de Bourse"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Attestation PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAllocations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs italic">
                      Aucun boursier enregistré. Cliquez sur "Attribuer une Bourse" pour démarrer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 2: ECHEANCIERS ─── */}
        {activeTab === "echeanciers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Étudiant &amp; Échéance</th>
                  <th className="py-3.5 px-5 text-center">Date d'Échéance</th>
                  <th className="py-3.5 px-5 text-center">Brut</th>
                  <th className="py-3.5 px-5 text-center">Bourse</th>
                  <th className="py-3.5 px-5 text-center">Net Dû</th>
                  <th className="py-3.5 px-5 text-center">Payé</th>
                  <th className="py-3.5 px-5 text-center">Reste</th>
                  <th className="py-3.5 px-5 text-center">Statut</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredSchedules.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-900 dark:text-white">{s.studentNom}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                    </td>

                    <td className="py-4 px-5 text-center font-medium text-slate-600 dark:text-slate-300">
                      {new Date(s.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    <td className="py-4 px-5 text-center text-slate-500">
                      {Number(s.grossAmount).toLocaleString()} F
                    </td>

                    <td className="py-4 px-5 text-center text-emerald-600 font-medium">
                      - {Number(s.scholarshipDeduction || 0).toLocaleString()} F
                    </td>

                    <td className="py-4 px-5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                      {Number(s.netAmount).toLocaleString()} F
                    </td>

                    <td className="py-4 px-5 text-center text-emerald-600 font-bold">
                      {Number(s.paidAmount || 0).toLocaleString()} F
                    </td>

                    <td className="py-4 px-5 text-center font-black text-rose-600 dark:text-rose-400">
                      {Number(s.balance).toLocaleString()} F
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        s.status === "Payé"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : s.status === "En retard"
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.balance > 0 && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedSchedule(s);
                                setPayAmount(s.balance);
                                setIsPayModal(true);
                              }}
                              className="h-8 px-2.5 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <CreditCard className="h-3 w-3" />
                              Régler
                            </Button>

                            <button
                              onClick={() => handleSendReminder(s.id)}
                              className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                              title="Envoyer relance SMS / WhatsApp"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportEcheancier(s.studentId, s.studentNom, s.studentMatricule)}
                          className="h-8 px-2 text-[10px] text-slate-500 hover:text-slate-800"
                          title="Télécharger l'Échéancier complet"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredSchedules.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs italic">
                      Aucun échéancier généré. Cliquez sur "Générer Échéancier" pour échelonner les mensualités d'un étudiant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 3: CATALOGUE BOURSES ─── */}
        {activeTab === "catalogue" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Programmes &amp; Types de Bourses Disponibles</h3>
              <Button onClick={() => setIsNewBourseModal(true)} size="sm" className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5">
                <Plus className="h-4 w-4" />
                Ajouter une Bourse
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(initialData.scholarships || []).map((sch: any) => (
                <div key={sch.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Award className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
                      {sch.type === "Pourcentage" ? `${sch.discountValue} %` : `${sch.discountValue} FCFA`}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sch.name}</h4>
                    <p className="text-xs text-slate-400">{sch.provider}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 space-y-1">
                    <p>Appliqué à : <span className="font-bold text-slate-700 dark:text-slate-300">{sch.appliesTo}</span></p>
                    <p>Année : <span className="font-bold text-slate-700 dark:text-slate-300">{sch.academicYear || "2025-2026"}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: NOUVELLE BOURSE ─── */}
      {isNewBourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Créer une Bourse / Exonération</h3>
              <button onClick={() => setIsNewBourseModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Intitulé de la Bourse *</label>
                <Input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="ex: Bourse d'État UEMOA" className="h-10 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Organisme Financeur</label>
                <Input value={bProvider} onChange={(e) => setBProvider(e.target.value)} placeholder="ex: Ministère de l'Enseignement Supérieur" className="h-10 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Type de Déduction</label>
                  <select value={bType} onChange={(e) => setBType(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    <option value="Pourcentage">Pourcentage (%)</option>
                    <option value="Montant Fixe">Montant Fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Valeur (Taux ou Montant) *</label>
                  <Input type="number" value={bDiscount} onChange={(e) => setBDiscount(Number(e.target.value))} className="h-10 text-xs font-bold text-amber-600" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsNewBourseModal(false)}>Annuler</Button>
              <Button onClick={handleSaveScholarship} disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">Enregistrer</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ATTRIBUER UNE BOURSE ─── */}
      {isAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Attribuer une Bourse à un Étudiant</h3>
              <button onClick={() => setIsAssignModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Étudiant Bénéficiaire *</label>
                <select value={assignStudentId} onChange={(e) => setAssignStudentId(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom} ({s.matricule})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Programme de Bourse *</label>
                <select value={assignScholarshipId} onChange={(e) => setAssignScholarshipId(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  {(initialData.scholarships || []).map((sch: any) => (
                    <option key={sch.id} value={sch.id}>{sch.name} ({sch.discountValue}%)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Taux d'Exonération (%)</label>
                  <Input type="number" value={assignDiscount} onChange={(e) => setAssignDiscount(Number(e.target.value))} className="h-10 text-xs font-bold text-amber-600" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Réf. Décision Officielle</label>
                  <Input value={assignRef} onChange={(e) => setAssignRef(e.target.value)} className="h-10 text-xs font-mono" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsAssignModal(false)}>Annuler</Button>
              <Button onClick={handleAssignScholarship} disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">Confirmer l'Attribution</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: GENERER ECHEANCIER ─── */}
      {isGenerateScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Générer l'Échéancier de Mensualités</h3>
              <button onClick={() => setIsGenerateScheduleModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Étudiant *</label>
                <select value={schedStudentId} onChange={(e) => setSchedStudentId(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom} ({s.matricule})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Scolarité Brute Annuelle (FCFA)</label>
                  <Input type="number" value={schedGross} onChange={(e) => setSchedGross(Number(e.target.value))} className="h-10 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Déduction Bourse (%)</label>
                  <Input type="number" value={schedDiscount} onChange={(e) => setSchedDiscount(Number(e.target.value))} className="h-10 text-xs font-bold text-amber-600" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Nombre de Mensualités</label>
                <select value={schedMonths} onChange={(e) => setSchedMonths(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <option value={9}>9 Mensualités (Octobre à Juin)</option>
                  <option value={6}>6 Mensualités (Semestriel)</option>
                  <option value={3}>3 Trimestres</option>
                </select>
              </div>

              {/* Live preview */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Annuel à Payer :</span>
                  <span className="font-bold text-indigo-600">{(schedGross - (schedGross * schedDiscount) / 100).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mensualité Estimée :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Math.round((schedGross - (schedGross * schedDiscount) / 100) / schedMonths).toLocaleString()} FCFA / mois</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsGenerateScheduleModal(false)}>Annuler</Button>
              <Button onClick={handleGenerateSchedule} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">Créer l'Échéancier</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: REGLER UNE ECHEANCE ─── */}
      {isPayModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Règlement de Mensualité</h3>
              <button onClick={() => setIsPayModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <p><span className="font-bold">Étudiant :</span> {selectedSchedule.studentNom}</p>
                <p><span className="font-bold">Échéance :</span> {selectedSchedule.label}</p>
                <p><span className="font-bold">Solde Restant :</span> <span className="font-black text-rose-600">{Number(selectedSchedule.balance).toLocaleString()} FCFA</span></p>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1.5">Montant Réglé (FCFA) *</label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} className="h-10 text-xs font-black text-emerald-600" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsPayModal(false)}>Annuler</Button>
              <Button onClick={handleRecordPayment} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">Valider le Règlement</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
