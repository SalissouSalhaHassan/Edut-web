"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  CreditCard, Search, Filter, Printer, Download, Check, X, User,
  Sparkles, Layers, FileText, CheckCircle2, AlertCircle, Image as ImageIcon,
  ChevronLeft, ChevronRight, RefreshCw, Upload, Eye, EyeOff, LayoutGrid, ShieldCheck, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getBranches } from "@/domains/settings/actions/settings.actions";
import CardDesigner from "./designer/CardDesigner";
import { StudentCard } from "./StudentCard";
import { exportCardToPDF } from "./designer/cardExportEngine";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SAMPLE_STUDENTS = [
  {
    id: 325,
    nomEtudiant: "Maman Dan Falké",
    prenomEtudiant: "Aboubacar",
    numAdmission: "EDUT-2024-000325",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Garçon",
    dateNaissance: "2002-07-09",
    lieuNaissance: "Téra",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 324,
    nomEtudiant: "Maman",
    prenomEtudiant: "Adah",
    numAdmission: "EDUT-2024-000324",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Garçon",
    dateNaissance: "2003-05-14",
    lieuNaissance: "Niamey",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 323,
    nomEtudiant: "Maman",
    prenomEtudiant: "Biba",
    numAdmission: "EDUT-2024-000323",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Fille",
    dateNaissance: "2003-11-20",
    lieuNaissance: "Zinder",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 322,
    nomEtudiant: "Mamadou Ibrahim",
    prenomEtudiant: "Salifou",
    numAdmission: "EDUT-2024-000322",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Garçon",
    dateNaissance: "2001-08-12",
    lieuNaissance: "Maradi",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 321,
    nomEtudiant: "Malam Balla",
    prenomEtudiant: "Sanoussi",
    numAdmission: "EDUT-2024-000321",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Garçon",
    dateNaissance: "2002-03-18",
    lieuNaissance: "Tahoua",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 320,
    nomEtudiant: "Malam Maina",
    prenomEtudiant: "Abass",
    numAdmission: "EDUT-2024-000320",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Garçon",
    dateNaissance: "2002-12-05",
    lieuNaissance: "Diffa",
    nationalite: "Nigérienne",
    photoPath: null,
  },
  {
    id: 319,
    nomEtudiant: "Malam Issoufou",
    prenomEtudiant: "Mme Hamiss",
    numAdmission: "EDUT-2024-000319",
    classe: "M2 Arabic",
    educationalLevel: "Master",
    sexe: "Fille",
    dateNaissance: "2003-09-30",
    lieuNaissance: "Dosso",
    nationalite: "Nigérienne",
    photoPath: null,
  },
];

function isValidPhoto(path?: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const p = path.trim().toLowerCase();
  if (p.length === 0 || p.includes("placeholder")) return false;
  return true;
}

export default function CardStudioContainer() {
  const [activeTab, setActiveTab] = useState<"design" | "données" | "impression">("design");
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Search State
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "selected" | "no-photo">("all");
  const [cardSide, setCardSide] = useState<"recto" | "verso">("recto");
  const [printing, setPrinting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getStudents(), getBranches()])
      .then(([studRes, branchRes]: [any, any]) => {
        let studData = studRes?.data?.data || studRes?.data || studRes || [];
        if (!Array.isArray(studData) || studData.length === 0) {
          studData = SAMPLE_STUDENTS;
        }

        const branchData = branchRes?.data?.data || branchRes?.data || [];

        setStudents(studData);
        if (studData.length > 0) {
          setPreviewStudentId(studData[0].id);
        }
        if (Array.isArray(branchData)) {
          setBranches(branchData);
        }
      })
      .catch((err) => {
        console.error("Error loading studio data:", err);
        setStudents(SAMPLE_STUDENTS);
        setPreviewStudentId(SAMPLE_STUDENTS[0].id);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePhotoUpload = (studentId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, photoPath: dataUrl } : s))
      );
      toast.success("Photo de l'élève ajoutée avec succès !");
    };
    reader.readAsDataURL(file);
  };

  const triggerUploadFor = (studentId: number) => {
    setUploadingStudentId(studentId);
    fileInputRef.current?.click();
  };

  // Filtered Students List for Left Sidebar
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const match =
        s.nomEtudiant?.toLowerCase().includes(q) ||
        s.prenomEtudiant?.toLowerCase().includes(q) ||
        s.numAdmission?.toLowerCase().includes(q) ||
        s.classe?.toLowerCase().includes(q);

      if (filterType === "selected") return match && selectedStudentIds.includes(s.id);
      if (filterType === "no-photo") return match && !isValidPhoto(s.photoPath);
      return match;
    });
  }, [students, searchQuery, filterType, selectedStudentIds]);

  // Active Preview Student
  const activeStudent = useMemo(() => {
    if (previewStudentId) {
      return students.find((s) => s.id === previewStudentId) || students[0] || null;
    }
    return students[0] || null;
  }, [students, previewStudentId]);

  const activeBranch = useMemo(() => {
    return branches[0] || null;
  }, [branches]);

  // Checkboxes Selection Logic
  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Selected Students List
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  // Handle High-DPI Batch Print Execution
  const handleBatchPrint = async () => {
    const listToPrint = selectedStudents.length > 0 ? selectedStudents : (activeStudent ? [activeStudent] : []);
    if (listToPrint.length === 0) {
      toast.error("Veuillez sélectionner au moins un élève pour l'impression.");
      return;
    }

    setPrinting(true);
    const toastId = toast.loading(`Préparation de ${listToPrint.length} carte(s) pour l'impression...`);

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const cardsPerPage = 9; // 3 cols x 3 rows grid
      const cardW = 85.6;
      const cardH = 54.0;
      const startX = 20.1;
      const startY = 24.0;

      // Temporary capture
      if (printRef.current) {
        const cardNodes = printRef.current.querySelectorAll<HTMLElement>(".batch-print-card");
        for (let i = 0; i < cardNodes.length; i++) {
          const cardNode = cardNodes[i];
          const canvas = await html2canvas(cardNode, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const pageIndex = Math.floor(i / cardsPerPage);
          const cardOnPage = i % cardsPerPage;
          const col = cardOnPage % 3;
          const row = Math.floor(cardOnPage / 3);

          const posX = startX + col * cardW;
          const posY = startY + row * cardH;

          if (cardOnPage === 0 && pageIndex > 0) {
            pdf.addPage("a4", "landscape");
          }

          pdf.addImage(imgData, "PNG", posX, posY, cardW, cardH);
          pdf.setDrawColor(220, 225, 230);
          pdf.setLineWidth(0.15);
          pdf.rect(posX, posY, cardW, cardH);
        }
      }

      pdf.save(`Cartes_ID_Batch_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Document PDF généré avec succès ! (${listToPrint.length} carte(s))`, { id: toastId });
    } catch (err: any) {
      console.error("Print Error:", err);
      toast.error("Erreur lors de la génération PDF", { id: toastId });
    } finally {
      setPrinting(false);
    }
  };

  const countWithPhoto = useMemo(() => students.filter((s) => isValidPhoto(s.photoPath)).length, [students]);
  const countNoPhoto = useMemo(() => students.filter((s) => !isValidPhoto(s.photoPath)).length, [students]);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] rounded-[2.5rem] border border-slate-200/80 bg-slate-50 overflow-hidden shadow-2xl select-none">
      {/* Hidden File Input for Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => uploadingStudentId && handlePhotoUpload(uploadingStudentId, e)}
        className="hidden"
      />

      {/* Top Header Bar with Main Tabs */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 leading-none">Studio Cartes ID</h1>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Pro
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Conception, gestion des données et impression HD 300 DPI
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs: Design | Données | Impression */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab("design")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "design"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Sparkles size={14} /> Design
          </button>
          <button
            onClick={() => setActiveTab("données")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "données"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileText size={14} /> Données ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("impression")}
            className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeTab === "impression"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Printer size={14} /> Impression ({selectedStudentIds.length || 1})
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBatchPrint}
            disabled={printing}
            className="h-10 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            {printing ? <RefreshCw size={15} className="animate-spin" /> : <Printer size={15} />}
            {printing ? "Génération PDF..." : `Imprimer les cartes (${selectedStudentIds.length || 1})`}
          </Button>
        </div>
      </header>

      {/* Main Container Layout: Left Student Selection Panel + Tab View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: SÉLECTION DES ÉLÈVES */}
        <aside className="w-80 bg-white border-r border-slate-200/80 flex flex-col h-full z-20 shadow-sm">
          {/* Sidebar Header & Counter */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Sélection des élèves
            </h3>
            <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {selectedStudentIds.length} sél.
            </span>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <Input
                type="text"
                placeholder="Nom ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 rounded-xl border-slate-200 text-xs font-bold bg-slate-50/60 focus:bg-white"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 mt-2.5">
              <button
                onClick={() => setFilterType("all")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tous ({students.length})
              </button>
              <button
                onClick={() => setFilterType("selected")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "selected" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Sél. ({selectedStudentIds.length})
              </button>
              <button
                onClick={() => setFilterType("no-photo")}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition ${
                  filterType === "no-photo" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Sans photo
              </button>
            </div>
          </div>

          {/* Select All Checkbox Bar */}
          <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-slate-600">Tout sélectionner</span>
            </label>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {filteredStudents.length} élèves
            </span>
          </div>

          {/* Student Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">
                Chargement de la liste des élèves...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                Aucun élève trouvé.
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                const isPreviewing = previewStudentId === st.id;
                const hasPhoto = isValidPhoto(st.photoPath);

                let photoUrl = hasPhoto ? st.photoPath : null;
                if (photoUrl && (photoUrl.startsWith("C:") || photoUrl.startsWith("file:"))) {
                  photoUrl = `/api/files?path=${encodeURIComponent(photoUrl)}`;
                }

                return (
                  <div
                    key={st.id}
                    onClick={() => setPreviewStudentId(st.id)}
                    className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer group ${
                      isPreviewing
                        ? "bg-indigo-50/90 border-indigo-300 shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleStudentSelection(st.id);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                      />

                      {/* Student Avatar */}
                      <div className="relative w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center">
                        {hasPhoto && photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={st.nomEtudiant}
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs uppercase">
                            {st.nomEtudiant?.[0] || "E"}
                          </div>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black truncate leading-snug ${isPreviewing ? "text-indigo-950" : "text-slate-900"}`}>
                          {st.nomEtudiant} {st.prenomEtudiant}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                          {st.classe || "Classe N/A"} • <span className="font-mono">{st.numAdmission || "N/A"}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {hasPhoto ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Prêt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Photo manquante
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Content Panel (Design | Données | Impression) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          {activeTab === "design" ? (
            <CardDesigner
              externalStudents={students}
              externalPreviewStudentId={previewStudentId}
              onExternalPreviewStudentChange={setPreviewStudentId}
              externalActiveBranch={activeBranch}
            />
          ) : activeTab === "données" ? (
            /* Tab 2: Students Data Table & Photo Management */
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Données des élèves pour les cartes d'identité</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gérez les photos, matricules et vérifiez l'état de préparation des cartes scolaires.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-100">
                    {countWithPhoto} avec photo
                  </span>
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl border border-amber-100">
                    {countNoPhoto} photos manquantes
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Élève</th>
                      <th className="py-3.5 px-4">Matricule</th>
                      <th className="py-3.5 px-4">Classe</th>
                      <th className="py-3.5 px-4">Genre</th>
                      <th className="py-3.5 px-4">Statut Photo</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredStudents.map((st) => {
                      const hasPhoto = isValidPhoto(st.photoPath);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                              {hasPhoto && st.photoPath ? (
                                <img
                                  src={st.photoPath.startsWith("http") ? st.photoPath : `/api/files?path=${encodeURIComponent(st.photoPath)}`}
                                  alt={st.nomEtudiant}
                                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs uppercase">
                                  {st.nomEtudiant?.[0] || "E"}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900">{st.nomEtudiant} {st.prenomEtudiant}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">{st.numAdmission || "N/A"}</td>
                          <td className="py-3 px-4">{st.classe || "Non assignée"}</td>
                          <td className="py-3 px-4">{st.sexe || "N/A"}</td>
                          <td className="py-3 px-4">
                            {hasPhoto ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                                <CheckCircle2 size={12} /> Prêt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px]">
                                <AlertCircle size={12} /> Photo manquante
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerUploadFor(st.id)}
                                className="rounded-xl font-bold text-[11px] text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                              >
                                <Upload size={12} className="mr-1" /> Photo
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPreviewStudentId(st.id);
                                  setActiveTab("design");
                                }}
                                className="rounded-xl font-bold text-[11px]"
                              >
                                <Eye size={13} className="mr-1" /> Aperçu Carte
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tab 3: HD 300 DPI Batch Print Preview Hub */
            <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={printRef}>
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Aperçu avant impression HD (300 DPI)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Grille d'impression CR80 Standard (85.6 × 54 mm) format A4 Paysage.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleBatchPrint}
                    disabled={printing}
                    className="h-10 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    <Printer size={16} /> Imprimer {selectedStudents.length || 1} carte(s)
                  </Button>
                </div>
              </div>

              {/* High Resolution Print Grid Container */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center">
                <div className="grid grid-cols-3 gap-6 max-w-5xl">
                  {(selectedStudents.length > 0 ? selectedStudents : (activeStudent ? [activeStudent] : [])).map((st) => (
                    <div key={st.id} className="batch-print-card shadow-md rounded-2xl overflow-hidden border border-slate-200 hover:scale-105 transition-transform">
                      <StudentCard
                        student={st}
                        schoolName={activeBranch?.nomBranch || "ÉCOLE GESTION PRO"}
                        academicYear="2025-2026"
                        side={cardSide}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
