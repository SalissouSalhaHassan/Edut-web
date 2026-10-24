"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Upload,
  Users,
  Trash2,
  X,
  Droplets,
  Lightbulb,
  Check,
  Info,
  FileText,
  FileSpreadsheet,
  Moon,
  Sun,
  SlidersHorizontal,
  Share2,
  Copy,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldAlert,
  ChevronDown,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { createCanevasReferenceItem, updateCanevasReferenceItem, deleteCanevasReferenceItem } from "@/domains/academics/actions/academics.actions";

interface SchoolRow {
  code: string;
  name: string;
  type: string;
  cycle: string;
  region: string;
  commune: string;
  quartier: string;
  statut: string;
  eleves: number;
  filles: number;
  garcons: number;
  enseignants: number;
  salles: number;
  eau: string;
  electricite: string;
  completion: number;
  lastUpdate: string;
}

const initialSchools: SchoolRow[] = [
  {
    code: "ETB-2026-001",
    name: "Ecole Excellence",
    type: "Privé",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey IV",
    quartier: "Yantala",
    statut: "Validé inspection",
    eleves: 642,
    filles: 318,
    garcons: 324,
    enseignants: 24,
    salles: 18,
    eau: "Oui",
    electricite: "Oui",
    completion: 98,
    lastUpdate: "27/06/2026",
  },
  {
    code: "ETB-2026-018",
    name: "Ecole Primaire Bobiel",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey I",
    quartier: "Bobiel",
    statut: "Brouillon",
    eleves: 481,
    filles: 236,
    garcons: 245,
    enseignants: 16,
    salles: 12,
    eau: "Non",
    electricite: "Oui",
    completion: 76,
    lastUpdate: "26/06/2026",
  },
  {
    code: "ETB-2026-043",
    name: "Complexe Scolaire Sahel",
    type: "Privé",
    cycle: "Collège",
    region: "Niamey",
    commune: "Niamey II",
    quartier: "Plateau",
    statut: "Validé école",
    eleves: 934,
    filles: 452,
    garcons: 482,
    enseignants: 41,
    salles: 26,
    eau: "Oui",
    electricite: "Oui",
    completion: 94,
    lastUpdate: "25/06/2026",
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey III",
    quartier: "Lazaret",
    statut: "Rejeté inspection",
    eleves: 388,
    filles: 190,
    garcons: 198,
    enseignants: 13,
    salles: 9,
    eau: "Oui",
    electricite: "Non",
    completion: 61,
    lastUpdate: "24/06/2026",
  },
  {
    code: "ETB-2026-104",
    name: "Lycee Municipal Est",
    type: "Public",
    cycle: "Lycée",
    region: "Niamey",
    commune: "Niamey V",
    quartier: "Aeroport",
    statut: "Transmis ministère",
    eleves: 1218,
    filles: 593,
    garcons: 625,
    enseignants: 58,
    salles: 34,
    eau: "Oui",
    electricite: "Oui",
    completion: 91,
    lastUpdate: "22/06/2026",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Valide: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    "A verifier": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    Incomplet: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    Brouillon: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400",
    "En correction": "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400",
    "Validé école": "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    "Rejeté inspection": "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-400",
    "Validé inspection": "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
    "Validé DREN": "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
    "Transmis ministère": "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    Archivé: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status] || "bg-slate-100 dark:bg-slate-800 dark:text-slate-300")}>
      {status}
    </span>
  );
}

function BooleanBadge({ value }: { value: string }) {
  const ok = value === "Oui";
  return (
    <span className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black",
      ok 
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" 
        : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
    )}>
      {value}
    </span>
  );
}

interface EtablissementsClientProps {
  initialCanevasReferences: {
    type: any[];
    cycle: any[];
    commune: any[];
  };
  educationalLevels: any[];
}

export default function EtablissementsClient({
  initialCanevasReferences,
  educationalLevels,
}: EtablissementsClientProps) {
  const [schoolsList, setSchoolsList] = useState<SchoolRow[]>(initialSchools);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edut_theme") || localStorage.getItem("edut_canevas_dark_mode");
      if (saved === "dark" || saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_canevas_dark_mode", String(next));
        localStorage.setItem("edut_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  // Dynamic References State
  const [communesList, setCommunesList] = useState<string[]>(() => {
    const fromRef = (initialCanevasReferences?.commune || []).map((c: any) => c.value || c);
    const defaults = ["Niamey I", "Niamey II", "Niamey III", "Niamey IV", "Niamey V"];
    return Array.from(new Set([...defaults, ...fromRef]));
  });

  // Dynamic Cycles linked to Niveaux d'Étude
  const [cyclesList] = useState<string[]>(() => {
    const fromLevels = (educationalLevels || []).map((l: any) => l.levelName || l.name || l);
    const fromRef = (initialCanevasReferences?.cycle || []).map((c: any) => c.value || c);
    const defaults = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
    return Array.from(new Set([...defaults, ...fromLevels, ...fromRef]));
  });

  const [typesList] = useState<string[]>(() => {
    const fromRef = (initialCanevasReferences?.type || []).map((t: any) => t.value || t);
    const defaults = ["Public", "Privé", "Communautaire", "Confessionnel"];
    return Array.from(new Set([...defaults, ...fromRef]));
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Type: tous");
  const [filterCycle, setFilterCycle] = useState("Cycle: tous");
  const [filterCommune, setFilterCommune] = useState("Commune");
  const [filterStatut, setFilterStatut] = useState("Statut: tous");

  // Segment Tab Filter (القائمة الإضافية للتصنيف السريع)
  const [segmentTab, setSegmentTab] = useState<"ALL" | "PUBLIC" | "PRIVE" | "INFRA_ALERT" | "VALIDE" | "PENDING">("ALL");

  // Additional Actions Menu State (القائمة الإضافية العلوية)
  const [isExtraMenuOpen, setIsExtraMenuOpen] = useState(false);

  // Row Level Action Menu (القائمة الإضافية لكل مؤسسة)
  const [activeRowMenuCode, setActiveRowMenuCode] = useState<string | null>(null);

  // Modal / Drawer States
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolRow | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Commune Modal State
  const [isAddCommuneOpen, setIsAddCommuneOpen] = useState(false);
  const [newCommuneName, setNewCommuneName] = useState("");
  const [isAddingCommune, setIsAddingCommune] = useState(false);

  // New School Fields
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Public");
  const [newCycle, setNewCycle] = useState(cyclesList[1] || "Primaire");
  const [newRegion, setNewRegion] = useState("Niamey");
  const [newCommune, setNewCommune] = useState(communesList[0] || "Niamey I");
  const [newQuartier, setNewQuartier] = useState("");
  const [newEleves, setNewEleves] = useState(300);
  const [newFilles, setNewFilles] = useState(150);
  const [newGarcons, setNewGarcons] = useState(150);
  const [newEnseignants, setNewEnseignants] = useState(10);
  const [newSalles, setNewSalles] = useState(6);
  const [newEau, setNewEau] = useState("Oui");
  const [newElectricite, setNewElectricite] = useState("Oui");

  // Create New Commune Handler
  const handleCreateCommune = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCommuneName.trim();
    if (!cleanName) {
      toast.error("Veuillez saisir le nom de la nouvelle commune.");
      return;
    }

    if (communesList.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
      toast.error("Cette commune existe déjà dans la liste.");
      return;
    }

    setIsAddingCommune(true);
    try {
      const res = await createCanevasReferenceItem("commune", cleanName);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCommunesList(prev => [...prev, cleanName]);
        setNewCommune(cleanName);
        setNewCommuneName("");
        toast.success(`La commune "${cleanName}" a été créée et ajoutée avec succès !`);
      }
    } catch (err) {
      setCommunesList(prev => [...prev, cleanName]);
      setNewCommune(cleanName);
      setNewCommuneName("");
      toast.success(`La commune "${cleanName}" a été ajoutée à la liste localement !`);
    } finally {
      setIsAddingCommune(false);
    }
  };

  // Commune Edit / Delete Handlers
  const [editingCommuneName, setEditingCommuneName] = useState<string | null>(null);
  const [editCommuneValue, setEditCommuneValue] = useState("");

  const handleUpdateCommune = async (oldName: string, newName: string) => {
    const cleanNew = newName.trim();
    if (!cleanNew) {
      toast.error("Veuillez saisir un nom valide.");
      return;
    }
    if (cleanNew === oldName) {
      setEditingCommuneName(null);
      return;
    }

    try {
      await updateCanevasReferenceItem(oldName, "commune", cleanNew);
      setCommunesList(prev => prev.map(c => c === oldName ? cleanNew : c));
      setSchoolsList(prev => prev.map(s => s.commune === oldName ? { ...s, commune: cleanNew } : s));
      setEditingCommuneName(null);
      toast.success(`Commune modifiée en "${cleanNew}"`);
    } catch {
      setCommunesList(prev => prev.map(c => c === oldName ? cleanNew : c));
      setSchoolsList(prev => prev.map(s => s.commune === oldName ? { ...s, commune: cleanNew } : s));
      setEditingCommuneName(null);
      toast.success(`Commune mise à jour localement en "${cleanNew}"`);
    }
  };

  const handleDeleteCommune = async (communeName: string) => {
    const inUseCount = schoolsList.filter(s => s.commune === communeName).length;
    if (inUseCount > 0) {
      toast.error(`Impossible de supprimer : ${inUseCount} établissement(s) rattaché(s) à cette commune.`);
      return;
    }

    try {
      await deleteCanevasReferenceItem(communeName, "commune");
      setCommunesList(prev => prev.filter(c => c !== communeName));
      toast.success(`Commune "${communeName}" supprimée.`);
    } catch {
      setCommunesList(prev => prev.filter(c => c !== communeName));
      toast.success(`Commune "${communeName}" retirée localement.`);
    }
  };

  // Status and Row Menu Handlers
  const handleUpdateStatus = (code: string, newStatus: string) => {
    setSchoolsList(prev => prev.map(s => s.code === code ? { ...s, statut: newStatus, lastUpdate: new Date().toLocaleDateString("fr-FR") } : s));
    toast.success(`Statut mis à jour : "${newStatus}" pour l'école ${code}`);
    setActiveRowMenuCode(null);
  };

  const handleDuplicateSchool = (school: SchoolRow) => {
    const newCode = `ETB-2026-${String(Math.floor(Math.random() * 899 + 100))}`;
    const duplicate: SchoolRow = {
      ...school,
      code: newCode,
      name: `${school.name} (Copie)`,
      statut: "Brouillon",
      lastUpdate: new Date().toLocaleDateString("fr-FR"),
    };
    setSchoolsList(prev => [duplicate, ...prev]);
    toast.success(`Établissement dupliqué avec le code ${newCode}`);
    setActiveRowMenuCode(null);
  };

  const handleCopySummary = () => {
    const summaryText = 
      `🏛️ *SYNTHÈSE CANEVAS ÉTABLISSEMENTS SCOLAIRES*\n` +
      `📅 Date : ${new Date().toLocaleDateString("fr-FR")}\n\n` +
      `🏫 Total Établissements : ${schoolsList.length}\n` +
      `👥 Effectif Total Élèves : ${totalStudents.toLocaleString("fr-FR")} (${totalGirls.toLocaleString("fr-FR")} F / ${totalBoys.toLocaleString("fr-FR")} G)\n` +
      `🏛️ Écoles Publiques : ${totalPublic} | 🏢 Écoles Privées : ${totalPrivate}\n` +
      `👨‍🏫 Personnel Enseignant : ${totalTeachers} Professeurs\n` +
      `🚪 Salles de classe : ${totalClassrooms} Salles\n` +
      `💧 Écoles avec eau potable : ${schoolsList.filter(s => s.eau === "Oui").length} / ${schoolsList.length}\n` +
      `💡 Écoles avec électricité : ${schoolsList.filter(s => s.electricite === "Oui").length} / ${schoolsList.length}\n\n` +
      `_Données officielles extraites via Edut Pro._`;

    navigator.clipboard.writeText(summaryText);
    toast.success("Synthèse copiée dans le presse-papier !");
    setIsExtraMenuOpen(false);
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterType("Type: tous");
    setFilterCycle("Cycle: tous");
    setFilterCommune("Commune");
    setFilterStatut("Statut: tous");
    setSegmentTab("ALL");
    toast.info("Tous les filtres ont été réinitialisés.");
    setIsExtraMenuOpen(false);
  };

  // Add School Handler
  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      toast.error("Veuillez renseigner le code et le nom de l'établissement.");
      return;
    }

    if (schoolsList.some(s => s.code.toLowerCase() === newCode.trim().toLowerCase())) {
      toast.error("Ce code établissement existe déjà.");
      return;
    }

    const newRow: SchoolRow = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      type: newType,
      cycle: newCycle,
      region: newRegion,
      commune: newCommune,
      quartier: newQuartier.trim() || "Centre",
      statut: "Brouillon",
      eleves: newEleves,
      filles: newFilles,
      garcons: newGarcons,
      enseignants: newEnseignants,
      salles: newSalles,
      eau: newEau,
      electricite: newElectricite,
      completion: 50,
      lastUpdate: new Date().toLocaleDateString("fr-FR"),
    };

    setSchoolsList(prev => [newRow, ...prev]);
    setIsAddOpen(false);
    toast.success(`L'établissement "${newRow.name}" a été ajouté.`);

    // Reset Form
    setNewName("");
    setNewCode("");
    setNewQuartier("");
  };

  // Edit School Submit Handler
  const handleEditSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchool) return;

    setSchoolsList(prev => prev.map(s => s.code === editSchool.code ? { ...editSchool, lastUpdate: new Date().toLocaleDateString("fr-FR") } : s));
    setEditSchool(null);
    toast.success("Informations de l'établissement mises à jour !");
  };

  // Delete School Handler
  const handleDeleteSchool = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet établissement ?")) {
      setSchoolsList(prev => prev.filter(s => s.code !== code));
      toast.success("Établissement supprimé.");
    }
  };

  // Validation Action
  const handleValidate = (code: string) => {
    setSchoolsList(prev => prev.map(s => s.code === code ? { ...s, statut: "Validé inspection", completion: 100 } : s));
    toast.success("Le canevas a été validé par l'inspection !");
  };

  // Filtered Schools calculation
  const filteredSchools = schoolsList.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.commune.toLowerCase().includes(q) ||
      s.quartier.toLowerCase().includes(q);

    const matchesType = filterType === "Type: tous" || s.type === filterType;
    const matchesCycle = filterCycle === "Cycle: tous" || s.cycle === filterCycle;
    const matchesCommune = filterCommune === "Commune" || s.commune === filterCommune;
    const matchesStatut = filterStatut === "Statut: tous" || s.statut === filterStatut;

    let matchesSegment = true;
    if (segmentTab === "PUBLIC") matchesSegment = s.type === "Public";
    else if (segmentTab === "PRIVE") matchesSegment = s.type === "Privé";
    else if (segmentTab === "INFRA_ALERT") matchesSegment = s.eau === "Non" || s.electricite === "Non";
    else if (segmentTab === "VALIDE") matchesSegment = s.statut.toLowerCase().includes("validé");
    else if (segmentTab === "PENDING") matchesSegment = s.statut.toLowerCase().includes("brouillon") || s.statut.toLowerCase().includes("verifier") || s.statut.toLowerCase().includes("rejeté");

    return matchesSearch && matchesType && matchesCycle && matchesCommune && matchesStatut && matchesSegment;
  });

  // KPI Calculations
  const totalStudents = filteredSchools.reduce((acc, curr) => acc + curr.eleves, 0);
  const totalGirls = filteredSchools.reduce((acc, curr) => acc + curr.filles, 0);
  const totalBoys = filteredSchools.reduce((acc, curr) => acc + curr.garcons, 0);
  const totalPublic = filteredSchools.filter(s => s.type === "Public").length;
  const totalPrivate = filteredSchools.filter(s => s.type === "Privé").length;
  const totalTeachers = filteredSchools.reduce((acc, curr) => acc + curr.enseignants, 0);
  const totalClassrooms = filteredSchools.reduce((acc, curr) => acc + curr.salles, 0);
  const countInfraAlert = schoolsList.filter(s => s.eau === "Non" || s.electricite === "Non").length;

  // Export Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code Établissement": s.code,
        "Nom de l'Établissement": s.name,
        "Statut Juridique": s.type,
        "Cycle / Niveau d'Étude": s.cycle,
        "Région": s.region,
        "Commune": s.commune,
        "Quartier / Village": s.quartier,
        "Total Élèves": s.eleves,
        "Filles": s.filles,
        "Garçons": s.garcons,
        "Enseignants": s.enseignants,
        "Salles de classe": s.salles,
        "Eau potable": s.eau,
        "Électricité": s.electricite,
        "Statut Validation": s.statut,
        "Complétude (%)": `${s.completion}%`,
        "Dernière mise à jour": s.lastUpdate,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Établissements");
      XLSX.writeFile(workbook, `Canevas_Etablissements_${Date.now()}.xlsx`);
      toast.success("Export Excel généré avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel.");
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    try {
      toast.success("Génération du rapport PDF officiel...");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("RÉPUBLIQUE DU NIGER", 14, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Ministère de l'Éducation Nationale — Direction des Statistiques", 14, 21);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS DOCUMENT", pageWidth - 80, 15);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'édition : ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 80, 20);
      doc.text(`Total structures : ${filteredSchools.length}`, pageWidth - 80, 25);

      const tableHeaders = ["N°", "Code", "Établissement", "Type", "Cycle", "Commune", "Élèves", "Profs", "Eau/Élec", "Statut"];
      const tableBody = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.type,
        s.cycle,
        s.commune,
        s.eleves.toLocaleString("fr-FR"),
        s.enseignants,
        `${s.eau === "Oui" ? "Eau✓" : "Eau✗"} / ${s.electricite === "Oui" ? "Élec✓" : "Élec✗"}`,
        s.statut
      ]);

      autoTable(doc, {
        startY: 34,
        head: [tableHeaders],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85]
        },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_Etablissements_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    }
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
      
      {/* Top Header */}
      <div className={cn(
        "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-6 rounded-[2.5rem] border shadow-sm print:hidden transition-all duration-300",
        isDarkMode
          ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/40 backdrop-blur-md"
          : "bg-white border-slate-100 text-slate-900 shadow-sm"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm",
            isDarkMode 
              ? "bg-indigo-950/60 border-indigo-800/80 text-indigo-400" 
              : "bg-indigo-50 border-indigo-100 text-indigo-600"
          )}>
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Canevas Établissements</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                isDarkMode 
                  ? "bg-indigo-950/80 text-indigo-300 border-indigo-800" 
                  : "bg-indigo-50 text-indigo-700 border-indigo-100"
              )}>
                OFFICIEL
              </span>
            </div>
            <p className={cn("text-xs font-semibold mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-400")}>
              Gestion centralisée des structures, communes, cycles et infrastructures scolaires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dark Mode Toggle Button */}
          <button 
            type="button"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Passer en mode clair" : "Activer le mode sombre"}
            className={cn(
              "h-11 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95",
              isDarkMode
                ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 hover:border-amber-500/50"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
            <span className="hidden sm:inline font-bold">{isDarkMode ? "Mode Clair" : "Mode Nuit"}</span>
          </button>

          {/* Gérer les Communes */}
          <button 
            onClick={() => setIsAddCommuneOpen(true)}
            className={cn(
              "h-11 px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition",
              isDarkMode
                ? "border-indigo-800/80 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300"
                : "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/80 text-indigo-700"
            )}
          >
            <MapPin size={16} />
            Gérer les Communes
          </button>

          {/* PDF Export */}
          <button 
            onClick={handleExportPDF}
            className={cn(
              "h-11 px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition shadow-xs",
              isDarkMode
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <FileText size={16} className="text-rose-500" />
            PDF
          </button>

          {/* Excel Export */}
          <button 
            onClick={handleExportExcel}
            className={cn(
              "h-11 px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition shadow-xs",
              isDarkMode
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Excel
          </button>

          {/* القائمة الإضافية (Extra Options & Tools Menu) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExtraMenuOpen(!isExtraMenuOpen)}
              className={cn(
                "h-11 px-3.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition shadow-xs",
                isDarkMode
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal size={15} className="text-indigo-500" />
              <span className="hidden sm:inline">Options</span>
              <ChevronDown size={14} className={cn("transition-transform", isExtraMenuOpen && "rotate-180")} />
            </button>

            {isExtraMenuOpen && (
              <div className={cn(
                "absolute right-0 top-12 z-50 w-64 rounded-2xl border p-2 shadow-2xl backdrop-blur-md animate-fade-in",
                isDarkMode
                  ? "bg-[#111827] border-slate-800 text-slate-200 shadow-black/60"
                  : "bg-white border-slate-200 text-slate-800 shadow-slate-900/15"
              )}>
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Outils & Actions Avancées
                </div>
                <button
                  onClick={handleCopySummary}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2.5 transition"
                >
                  <Copy size={15} className="text-indigo-500" />
                  <span>Copier Synthèse Globale</span>
                </button>
                <button
                  onClick={() => { setSegmentTab("INFRA_ALERT"); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2.5 transition text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle size={15} />
                  <span>Alerte Infrastructures ({countInfraAlert})</span>
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx,.xls,.csv";
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        toast.success(`Fichier ${file.name} sélectionné pour importation !`);
                      }
                    };
                    input.click();
                    setIsExtraMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2.5 transition"
                >
                  <Upload size={15} className="text-emerald-500" />
                  <span>Importer Données (Excel)</span>
                </button>
                <button
                  onClick={handleResetFilters}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2.5 transition text-rose-500"
                >
                  <RefreshCw size={15} />
                  <span>Réinitialiser les Filtres</span>
                </button>
              </div>
            )}
          </div>

          {/* Add School Button */}
          <button 
            onClick={() => setIsAddOpen(true)}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={16} />
            Ajouter Établissement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Card 1 */}
        <div className={cn(
          "p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800 text-white shadow-black/20" : "bg-white border-slate-100"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                Établissements
              </p>
              <h3 className="text-2xl font-black mt-1">{filteredSchools.length}</h3>
              <p className="text-[11px] font-bold text-indigo-500 mt-1">{communesList.length} communes enregistrées</p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isDarkMode ? "bg-indigo-950/70 text-indigo-400" : "bg-indigo-50 text-indigo-600"
            )}>
              <Building2 size={20} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className={cn(
          "p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800 text-white shadow-black/20" : "bg-white border-slate-100"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                Effectif Total Élèves
              </p>
              <h3 className="text-2xl font-black mt-1">{totalStudents.toLocaleString("fr-FR")}</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                {totalGirls.toLocaleString("fr-FR")} F / {totalBoys.toLocaleString("fr-FR")} G
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isDarkMode ? "bg-blue-950/70 text-blue-400" : "bg-blue-50 text-blue-600"
            )}>
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className={cn(
          "p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800 text-white shadow-black/20" : "bg-white border-slate-100"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                Écoles Publiques
              </p>
              <h3 className="text-2xl font-black mt-1">{totalPublic}</h3>
              <p className="text-[11px] font-bold text-emerald-500 mt-1">
                {Math.round((totalPublic / (filteredSchools.length || 1)) * 100)}% du total ({totalPrivate} privées)
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isDarkMode ? "bg-emerald-950/70 text-emerald-400" : "bg-emerald-50 text-emerald-600"
            )}>
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className={cn(
          "p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800 text-white shadow-black/20" : "bg-white border-slate-100"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                Cycles de Formation
              </p>
              <h3 className="text-2xl font-black mt-1">{cyclesList.length}</h3>
              <p className="text-[11px] font-bold text-amber-500 mt-1">Niveaux d'étude synchronisés</p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isDarkMode ? "bg-amber-950/70 text-amber-400" : "bg-amber-50 text-amber-600"
            )}>
              <Info size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── القائمة الإضافية: شريط التبويبات والتصنيف السريع (Quick Segment Filter Tabs) ─── */}
      <div className={cn(
        "p-2 rounded-2xl border print:hidden flex items-center gap-1.5 overflow-x-auto custom-scrollbar transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100 shadow-xs"
      )}>
        {[
          { id: "ALL", label: "Tous", count: schoolsList.length },
          { id: "PUBLIC", label: "Publics", count: totalPublic },
          { id: "PRIVE", label: "Privés", count: totalPrivate },
          { id: "INFRA_ALERT", label: "Sans Eau/Élec", count: countInfraAlert, alert: countInfraAlert > 0 },
          { id: "VALIDE", label: "Validés", count: schoolsList.filter(s => s.statut.toLowerCase().includes("validé")).length },
          { id: "PENDING", label: "En attente", count: schoolsList.filter(s => s.statut.toLowerCase().includes("brouillon") || s.statut.toLowerCase().includes("verifier") || s.statut.toLowerCase().includes("rejeté")).length },
        ].map((tab) => {
          const isActive = segmentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSegmentTab(tab.id as any)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                isActive
                  ? "bg-white/20 text-white"
                  : tab.alert
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                    : isDarkMode
                      ? "bg-slate-800 text-slate-400"
                      : "bg-slate-100 text-slate-500"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className={cn(
        "p-4 rounded-3xl border shadow-sm space-y-3 print:hidden transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800 text-white shadow-black/20" : "bg-white border-slate-100"
      )}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, commune ou quartier..." 
              className={cn(
                "w-full h-11 pl-11 pr-4 border rounded-2xl outline-none font-semibold text-xs transition",
                isDarkMode 
                  ? "bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500" 
                  : "bg-slate-50 border-slate-100 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className={cn(
                "h-11 px-3 border rounded-2xl text-xs font-bold outline-none transition",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-slate-50 border-slate-100 text-slate-700"
              )}
            >
              <option value="Type: tous">Type: Tous</option>
              {typesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={filterCycle} 
              onChange={e => setFilterCycle(e.target.value)}
              className={cn(
                "h-11 px-3 border rounded-2xl text-xs font-bold outline-none transition",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-slate-50 border-slate-100 text-slate-700"
              )}
            >
              <option value="Cycle: tous">Cycle (Niveau): Tous</option>
              {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filterCommune} 
              onChange={e => setFilterCommune(e.target.value)}
              className={cn(
                "h-11 px-3 border rounded-2xl text-xs font-bold outline-none transition",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-slate-50 border-slate-100 text-slate-700"
              )}
            >
              <option value="Commune">Commune: Toutes</option>
              {communesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filterStatut} 
              onChange={e => setFilterStatut(e.target.value)}
              className={cn(
                "h-11 px-3 border rounded-2xl text-xs font-bold outline-none transition",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-slate-50 border-slate-100 text-slate-700"
              )}
            >
              <option value="Statut: tous">Statut: Tous</option>
              <option value="Brouillon">Brouillon</option>
              <option value="A verifier">À vérifier</option>
              <option value="Validé école">Validé école</option>
              <option value="Validé inspection">Validé inspection</option>
              <option value="Rejeté inspection">Rejeté inspection</option>
              <option value="Transmis ministère">Transmis ministère</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className={cn(
        "rounded-3xl border shadow-sm overflow-hidden transition-colors",
        isDarkMode 
          ? "bg-[#111827] border-slate-800 shadow-xl shadow-black/20" 
          : "bg-white border-slate-100 shadow-sm"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className={cn(
                "border-b text-[10px] uppercase tracking-widest font-black transition-colors",
                isDarkMode 
                  ? "bg-slate-900/80 border-slate-800 text-slate-400" 
                  : "bg-slate-50/50 border-slate-100 text-slate-400"
              )}>
                <th className="py-4 px-6">Code & Établissement</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Cycle</th>
                <th className="py-4 px-4">Commune & Quartier</th>
                <th className="py-4 px-4 text-center">Élèves</th>
                <th className="py-4 px-4 text-center">Profs / Salles</th>
                <th className="py-4 px-4 text-center">Eau / Électricité</th>
                <th className="py-4 px-4 text-center">Statut</th>
                <th className="py-4 px-6 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className={cn(
              "divide-y text-xs font-bold transition-colors",
              isDarkMode 
                ? "divide-slate-800/80 text-slate-300" 
                : "divide-slate-50 text-slate-700"
            )}>
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Aucun établissement trouvé selon les critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr 
                    key={school.code} 
                    className={cn(
                      "transition-colors",
                      isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs",
                          isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                        )}>
                          {school.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn("font-black", isDarkMode ? "text-white" : "text-slate-900")}>{school.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{school.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black",
                        school.type === "Public" 
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" 
                          : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      )}>
                        {school.type}
                      </span>
                    </td>

                    <td className={cn("py-4 px-4 font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                      {school.cycle}
                    </td>

                    <td className="py-4 px-4">
                      <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-900")}>{school.commune}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{school.quartier}</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <p className={cn("font-black", isDarkMode ? "text-white" : "text-slate-900")}>{school.eleves}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{school.filles}F / {school.garcons}G</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{school.enseignants} Profs</p>
                      <p className="text-[10px] text-slate-400 font-medium">{school.salles} Salles</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <BooleanBadge value={school.eau} />
                        <BooleanBadge value={school.electricite} />
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={school.statut} />
                    </td>

                    <td className="py-4 px-6 text-right print:hidden relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setSelectedSchool(school)}
                          className={cn(
                            "p-2 rounded-xl transition",
                            isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          )}
                          title="Voir détails"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          onClick={() => setEditSchool(school)}
                          className={cn(
                            "p-2 rounded-xl transition",
                            isDarkMode ? "bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          )}
                          title="Modifier"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchool(school.code)}
                          className={cn(
                            "p-2 rounded-xl transition",
                            isDarkMode ? "bg-rose-950/60 hover:bg-rose-900/60 text-rose-400" : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                          )}
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>

                        {/* القائمة الإضافية للسطر (Row Actions Dropdown) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveRowMenuCode(activeRowMenuCode === school.code ? null : school.code)}
                            className={cn(
                              "p-2 rounded-xl transition",
                              isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                            )}
                            title="Plus d'actions"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {activeRowMenuCode === school.code && (
                            <div className={cn(
                              "absolute right-0 top-10 z-40 w-52 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md text-left",
                              isDarkMode 
                                ? "bg-[#111827] border-slate-800 text-slate-200 shadow-black/80" 
                                : "bg-white border-slate-200 text-slate-800 shadow-slate-900/15"
                            )}>
                              <button
                                onClick={() => { setSelectedSchool(school); setActiveRowMenuCode(null); }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"
                              >
                                <Eye size={14} className="text-blue-500" />
                                <span>Fiche Complète</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(school.code, "Validé inspection")}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-cyan-600 dark:text-cyan-400"
                              >
                                <CheckCircle2 size={14} />
                                <span>Valider Inspection</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(school.code, "Transmis ministère")}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                              >
                                <ShieldCheck size={14} />
                                <span>Transmis Ministère</span>
                              </button>
                              <button
                                onClick={() => handleDuplicateSchool(school)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400"
                              >
                                <Copy size={14} />
                                <span>Dupliquer École</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: GESTION DES COMMUNES (ADD, EDIT, DELETE) ─── */}
      {isAddCommuneOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className={cn(
            "rounded-[2.5rem] border shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
          )}>
            <button 
              onClick={() => setIsAddCommuneOpen(false)}
              className={cn(
                "absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                isDarkMode ? "bg-indigo-950/70 text-indigo-400" : "bg-indigo-50 text-indigo-600"
              )}>
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black">Gestion des Communes</h3>
                <p className="text-xs text-slate-400 font-semibold">Ajouter, modifier ou supprimer des communes scolaires.</p>
              </div>
            </div>

            {/* Add Commune Form */}
            <form onSubmit={handleCreateCommune} className={cn(
              "space-y-3 p-4 rounded-2xl border mb-6",
              isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
            )}>
              <label className="text-[10px] font-black text-slate-400 uppercase block">Ajouter une nouvelle commune</label>
              <div className="flex gap-2">
                <input 
                  required 
                  value={newCommuneName} 
                  onChange={e => setNewCommuneName(e.target.value)} 
                  placeholder="Ex: Niamey VI, Dosso Commune 1, Maradi Nord..." 
                  className={cn(
                    "flex-1 h-11 px-4 border rounded-xl outline-none font-semibold text-xs transition",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                  )} 
                />
                <button 
                  type="submit" 
                  disabled={isAddingCommune}
                  className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus size={15} />
                  {isAddingCommune ? "..." : "Ajouter"}
                </button>
              </div>
            </form>

            {/* Registered Communes List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Communes Enregistrées ({communesList.length})</h4>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {communesList.map((commune) => {
                  const isEditing = editingCommuneName === commune;
                  const schoolCount = schoolsList.filter(s => s.commune === commune).length;

                  return (
                    <div 
                      key={commune} 
                      className={cn(
                        "flex items-center justify-between p-3.5 border rounded-2xl transition",
                        isDarkMode ? "bg-slate-900/50 border-slate-800 hover:bg-slate-800/50" : "bg-slate-50/80 border-slate-100 hover:bg-slate-100/50"
                      )}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            value={editCommuneValue}
                            onChange={e => setEditCommuneValue(e.target.value)}
                            className={cn(
                              "flex-1 h-9 px-3 border rounded-lg text-xs font-bold outline-none",
                              isDarkMode ? "bg-slate-900 border-indigo-400 text-white" : "bg-white border-indigo-300 text-slate-900"
                            )}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCommune(commune, editCommuneValue)}
                            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            title="Enregistrer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommuneName(null)}
                            className={cn(
                              "p-2 rounded-lg transition",
                              isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            )}
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                              isDarkMode ? "bg-indigo-950/70 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                            )}>
                              <MapPin size={14} />
                            </div>
                            <span className={cn("font-bold text-xs", isDarkMode ? "text-white" : "text-slate-900")}>{commune}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black",
                              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200/70 text-slate-600"
                            )}>
                              {schoolCount} {schoolCount > 1 ? "écoles" : "école"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommuneName(commune);
                                setEditCommuneValue(commune);
                              }}
                              className={cn(
                                "p-1.5 rounded-lg transition",
                                isDarkMode ? "text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/60" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              )}
                              title="Modifier cette commune"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommune(commune)}
                              className={cn(
                                "p-1.5 rounded-lg transition",
                                isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-950/60" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              )}
                              title="Supprimer cette commune"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn("flex justify-end pt-6 mt-6 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")}>
              <button 
                type="button" 
                onClick={() => setIsAddCommuneOpen(false)} 
                className={cn(
                  "h-11 px-6 rounded-xl font-bold text-xs transition",
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAWER / MODAL: VIEW DETAILS ─── */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className={cn(
            "rounded-[2.5rem] border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
          )}>
            <button 
              onClick={() => setSelectedSchool(null)}
              className={cn(
                "absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-xl shrink-0",
                isDarkMode ? "bg-indigo-950/70 border-indigo-800 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
              )}>
                {selectedSchool.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black">{selectedSchool.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Code: {selectedSchool.code} · Commune: {selectedSchool.commune}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className={cn(
                "p-4 rounded-2xl border",
                isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Élèves Totaux</p>
                <p className="text-lg font-black mt-1">{selectedSchool.eleves}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedSchool.filles} Filles / {selectedSchool.garcons} Garçons</p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl border",
                isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Personnel Enseignant</p>
                <p className="text-lg font-black mt-1">{selectedSchool.enseignants} Profs</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.enseignants)} élèves/prof</p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl border",
                isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Salles de classe</p>
                <p className="text-lg font-black mt-1">{selectedSchool.salles} Salles</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.salles)} élèves/salle</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Infrastructures & Services</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0", 
                    selectedSchool.eau === "Oui" 
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" 
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  )}>
                    <Droplets size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</p>
                    <p className="text-sm font-black mt-0.5">{selectedSchool.eau === "Oui" ? "Disponible" : "Non équipé"}</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0", 
                    selectedSchool.electricite === "Oui" 
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" 
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  )}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Électricité</p>
                    <p className="text-sm font-black mt-0.5">{selectedSchool.electricite === "Oui" ? "Disponible" : "Non raccordé"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Localisation & Cycle</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Cycle (Niveau)</span>
                  <span>{selectedSchool.cycle}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
                  <span>{selectedSchool.region}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
                  <span>{selectedSchool.commune}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Quartier</span>
                  <span>{selectedSchool.quartier}</span>
                </div>
              </div>
            </div>

            <div className={cn("flex justify-between items-center pt-6 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Complétude canevas:</span>
                <span className="text-sm font-black text-indigo-500">{selectedSchool.completion}%</span>
              </div>
              <div className="flex gap-2">
                {selectedSchool.statut !== "Validé inspection" && (
                  <button 
                    onClick={() => { handleValidate(selectedSchool.code); setSelectedSchool(null); }}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Valider le canevas
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSchool(null)}
                  className={cn(
                    "h-10 px-4 rounded-xl font-bold text-xs transition",
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD SCHOOL ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className={cn(
            "rounded-[2.5rem] border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
          )}>
            <button 
              onClick={() => setIsAddOpen(false)}
              className={cn(
                "absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black mb-6">Ajouter un établissement</h3>
            
            <form onSubmit={handleAddSchool} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école *</label>
                  <input 
                    required 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value)} 
                    placeholder="Ex: ETB-2026-999" 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input 
                    required 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="Ex: Ecole Commune V" 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value)} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {typesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle (Niveau d'Étude)</label>
                  <select 
                    value={newCycle} 
                    onChange={e => setNewCycle(e.target.value)} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddCommuneOpen(true)}
                      className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Nouveau
                    </button>
                  </div>
                  <select 
                    value={newCommune} 
                    onChange={e => setNewCommune(e.target.value)} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {communesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input 
                    value={newQuartier} 
                    onChange={e => setNewQuartier(e.target.value)} 
                    placeholder="Ex: Bobiel" 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input 
                    type="number" 
                    value={newEleves} 
                    onChange={e => setNewEleves(Number(e.target.value))} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input 
                    type="number" 
                    value={newFilles} 
                    onChange={e => setNewFilles(Number(e.target.value))} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input 
                    type="number" 
                    value={newGarcons} 
                    onChange={e => setNewGarcons(Number(e.target.value))} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input 
                    type="number" 
                    value={newEnseignants} 
                    onChange={e => setNewEnseignants(Number(e.target.value))} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input 
                    type="number" 
                    value={newSalles} 
                    onChange={e => setNewSalles(Number(e.target.value))} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select 
                    value={newEau} 
                    onChange={e => setNewEau(e.target.value)} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select 
                    value={newElectricite} 
                    onChange={e => setNewElectricite(e.target.value)} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className={cn("flex justify-end gap-3 pt-4 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)} 
                  className={cn(
                    "h-12 px-6 rounded-xl font-bold text-sm transition",
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition"
                >
                  Créer l'établissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT SCHOOL ─── */}
      {editSchool && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className={cn(
            "rounded-[2.5rem] border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
          )}>
            <button 
              onClick={() => setEditSchool(null)}
              className={cn(
                "absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black mb-6">Modifier l'établissement</h3>
            
            <form onSubmit={handleEditSchoolSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école (Non modifiable)</label>
                  <input 
                    readOnly 
                    value={editSchool.code} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm cursor-not-allowed",
                      isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input 
                    required 
                    value={editSchool.name} 
                    onChange={e => setEditSchool({ ...editSchool, name: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select 
                    value={editSchool.type} 
                    onChange={e => setEditSchool({ ...editSchool, type: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {typesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle (Niveau d'Étude)</label>
                  <select 
                    value={editSchool.cycle} 
                    onChange={e => setEditSchool({ ...editSchool, cycle: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {cyclesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                    <button 
                      type="button" 
                      onClick={() => setIsAddCommuneOpen(true)}
                      className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Nouveau
                    </button>
                  </div>
                  <select 
                    value={editSchool.commune} 
                    onChange={e => setEditSchool({ ...editSchool, commune: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    {communesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input 
                    value={editSchool.quartier} 
                    onChange={e => setEditSchool({ ...editSchool, quartier: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input 
                    type="number" 
                    value={editSchool.eleves} 
                    onChange={e => setEditSchool({ ...editSchool, eleves: Number(e.target.value) })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input 
                    type="number" 
                    value={editSchool.filles} 
                    onChange={e => setEditSchool({ ...editSchool, filles: Number(e.target.value) })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input 
                    type="number" 
                    value={editSchool.garcons} 
                    onChange={e => setEditSchool({ ...editSchool, garcons: Number(e.target.value) })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input 
                    type="number" 
                    value={editSchool.enseignants} 
                    onChange={e => setEditSchool({ ...editSchool, enseignants: Number(e.target.value) })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input 
                    type="number" 
                    value={editSchool.salles} 
                    onChange={e => setEditSchool({ ...editSchool, salles: Number(e.target.value) })} 
                    className={cn(
                      "w-full h-12 px-4 border rounded-xl outline-none font-semibold text-sm transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                    )} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select 
                    value={editSchool.eau} 
                    onChange={e => setEditSchool({ ...editSchool, eau: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select 
                    value={editSchool.electricite} 
                    onChange={e => setEditSchool({ ...editSchool, electricite: e.target.value })} 
                    className={cn(
                      "w-full h-12 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    )}
                  >
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className={cn("flex justify-end gap-3 pt-4 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                <button 
                  type="button" 
                  onClick={() => setEditSchool(null)} 
                  className={cn(
                    "h-12 px-6 rounded-xl font-bold text-sm transition",
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition"
                >
                  Sauvegarder les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
