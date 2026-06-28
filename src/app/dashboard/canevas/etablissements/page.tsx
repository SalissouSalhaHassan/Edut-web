"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    type: "Prive",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey IV",
    quartier: "Yantala",
    statut: "Valide",
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
    statut: "A verifier",
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
    type: "Prive",
    cycle: "College",
    region: "Niamey",
    commune: "Niamey II",
    quartier: "Plateau",
    statut: "Valide",
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
    statut: "Incomplet",
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
    cycle: "Lycee",
    region: "Niamey",
    commune: "Niamey V",
    quartier: "Aeroport",
    statut: "Valide",
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
    Valide: "border-emerald-100 bg-emerald-50 text-emerald-700",
    "A verifier": "border-amber-100 bg-amber-50 text-amber-700",
    Incomplet: "border-rose-100 bg-rose-50 text-rose-700",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status] || "bg-slate-100")}>
      {status}
    </span>
  );
}

function BooleanBadge({ value }: { value: string }) {
  const ok = value === "Oui";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-black", ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {value}
    </span>
  );
}

export default function EtablissementsPage() {
  const [schoolsList, setSchoolsList] = useState<SchoolRow[]>(initialSchools);

  // Filter States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Type: tous");
  const [filterCycle, setFilterCycle] = useState("Cycle: tous");
  const [filterCommune, setFilterCommune] = useState("Commune");
  const [filterStatut, setFilterStatut] = useState("Statut: tous");

  // Modal / Drawer States
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolRow | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New School Fields
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Public");
  const [newCycle, setNewCycle] = useState("Primaire");
  const [newRegion, setNewRegion] = useState("Niamey");
  const [newCommune, setNewCommune] = useState("Niamey I");
  const [newQuartier, setNewQuartier] = useState("");
  const [newEleves, setNewEleves] = useState(300);
  const [newFilles, setNewFilles] = useState(150);
  const [newGarcons, setNewGarcons] = useState(150);
  const [newEnseignants, setNewEnseignants] = useState(10);
  const [newSalles, setNewSalles] = useState(6);
  const [newEau, setNewEau] = useState("Oui");
  const [newElectricite, setNewElectricite] = useState("Oui");

  // Filtering Logic
  const filteredSchools = schoolsList.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(search.toLowerCase()) ||
      school.code.toLowerCase().includes(search.toLowerCase()) ||
      school.commune.toLowerCase().includes(search.toLowerCase()) ||
      school.quartier.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      filterType === "Type: tous" || school.type === filterType;

    const matchesCycle =
      filterCycle === "Cycle: tous" || school.cycle === filterCycle;

    const matchesCommune =
      filterCommune === "Commune" || school.commune === filterCommune;

    const matchesStatut =
      filterStatut === "Statut: tous" || school.statut === filterStatut;

    return matchesSearch && matchesType && matchesCycle && matchesCommune && matchesStatut;
  });

  // KPI calculations based on filtered list
  const totalStudents = filteredSchools.reduce((sum, s) => sum + s.eleves, 0);
  const totalPublic = filteredSchools.filter(s => s.type === "Public").length;
  const totalPrivate = filteredSchools.filter(s => s.type === "Prive").length;

  // Add School submit
  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) {
      toast.error("Veuillez remplir le nom et le code de l'établissement.");
      return;
    }

    const newSchool: SchoolRow = {
      code: newCode,
      name: newName,
      type: newType,
      cycle: newCycle,
      region: newRegion,
      commune: newCommune,
      quartier: newQuartier || "Quartier non spécifié",
      statut: "A verifier",
      eleves: Number(newEleves),
      filles: Number(newFilles),
      garcons: Number(newGarcons),
      enseignants: Number(newEnseignants),
      salles: Number(newSalles),
      eau: newEau,
      electricite: newElectricite,
      completion: 50,
      lastUpdate: new Date().toLocaleDateString("fr-FR"),
    };

    setSchoolsList([...schoolsList, newSchool]);
    setIsAddOpen(false);
    resetForm();
    toast.success("Établissement ajouté avec succès !");
  };

  const resetForm = () => {
    setNewName("");
    setNewCode("");
    setNewType("Public");
    setNewCycle("Primaire");
    setNewRegion("Niamey");
    setNewCommune("Niamey I");
    setNewQuartier("");
    setNewEleves(300);
    setNewFilles(150);
    setNewGarcons(150);
    setNewEnseignants(10);
    setNewSalles(6);
    setNewEau("Oui");
    setNewElectricite("Oui");
  };

  // Delete school
  const handleDeleteSchool = (code: string) => {
    if (confirm(`Voulez-vous supprimer l'établissement ${code} ?`)) {
      setSchoolsList(schoolsList.filter((s) => s.code !== code));
      toast.success("Établissement supprimé.");
    }
  };

  // Edit School submit
  const handleEditSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchool) return;

    setSchoolsList(
      schoolsList.map((s) => (s.code === editSchool.code ? editSchool : s))
    );
    setEditSchool(null);
    toast.success("Détails de l'établissement mis à jour.");
  };

  // Export to CSV
  const handleExport = () => {
    toast.success("Génération du rapport d'exportation...");
    let csv = "Code,Etablissement,Type,Cycle,Region,Commune,Quartier,Eleves,Filles,Garcons,Enseignants,Salles,Eau,Electricite,Statut\n";
    filteredSchools.forEach((s) => {
      csv += `${s.code},"${s.name}",${s.type},${s.cycle},${s.region},"${s.commune}","${s.quartier}",${s.eleves},${s.filles},${s.garcons},${s.enseignants},${s.salles},${s.eau},${s.electricite},${s.statut}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "etablissements_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleValidate = (code: string) => {
    setSchoolsList(schoolsList.map(s => s.code === code ? { ...s, statut: "Valide", completion: 100 } : s));
    toast.success(`Établissement ${code} validé avec succès.`);
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Liste des Etablissements</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Registre central des ecoles, colleges et lycees</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link href="/dashboard/canevas/import" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors">
              <Upload size={16} /> Import Excel
            </Link>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} /> Nouvel etablissement
            </button>
            <button 
              onClick={handleExport}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Etablissements", value: filteredSchools.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Publics", value: totalPublic, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Prives", value: totalPrivate, icon: Building2, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Total eleves", value: totalStudents.toLocaleString("fr-FR"), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", item.bg, item.color)}>
                  <Icon size={22} />
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">2025-2026</span>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
            </div>
          );
        })}
      </section>

      {/* Filter and Table area */}
      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 print:hidden">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_150px_150px_150px_150px]">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="text-slate-400" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400 text-slate-800" 
                placeholder="Rechercher par nom, code, commune..." 
              />
              {search && <X size={16} className="text-slate-400 cursor-pointer" onClick={() => setSearch("")} />}
            </div>
            
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="Type: tous">Type: tous</option>
              <option value="Public">Public</option>
              <option value="Prive">Prive</option>
            </select>
            
            <select 
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="Cycle: tous">Cycle: tous</option>
              <option value="Prescolaire">Prescolaire</option>
              <option value="Primaire">Primaire</option>
              <option value="College">College</option>
              <option value="Lycee">Lycee</option>
            </select>
            
            <select 
              value={filterCommune}
              onChange={(e) => setFilterCommune(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="Commune">Commune: toutes</option>
              <option value="Niamey I">Niamey I</option>
              <option value="Niamey II">Niamey II</option>
              <option value="Niamey III">Niamey III</option>
              <option value="Niamey IV">Niamey IV</option>
              <option value="Niamey V">Niamey V</option>
            </select>
            
            <select 
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="Statut: tous">Statut: tous</option>
              <option value="Valide">Valide</option>
              <option value="A verifier">A verifier</option>
              <option value="Incomplet">Incomplet</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4">N</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Etablissement</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Cycle</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Commune</th>
                <th className="px-5 py-4">Quartier</th>
                <th className="px-5 py-4">Eleves</th>
                <th className="px-5 py-4">Filles</th>
                <th className="px-5 py-4">Garcons</th>
                <th className="px-5 py-4">Enseignants</th>
                <th className="px-5 py-4">Salles</th>
                <th className="px-5 py-4">Eau</th>
                <th className="px-5 py-4">Electricite</th>
                <th className="px-5 py-4">Completion</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Mise a jour</th>
                <th className="px-5 py-4 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.map((school, index) => (
                <tr key={school.code} className="text-sm font-bold text-slate-700 transition hover:bg-indigo-50/30">
                  <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                  <td className="px-5 py-4 font-black text-indigo-600">{school.code}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{school.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-400"><MapPin size={12} /> {school.quartier}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">{school.type}</td>
                  <td className="px-5 py-4">{school.cycle}</td>
                  <td className="px-5 py-4">{school.region}</td>
                  <td className="px-5 py-4">{school.commune}</td>
                  <td className="px-5 py-4">{school.quartier}</td>
                  <td className="px-5 py-4 font-black text-slate-950">{school.eleves.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4 text-pink-600">{school.filles.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4 text-blue-600">{school.garcons.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4">{school.enseignants}</td>
                  <td className="px-5 py-4">{school.salles}</td>
                  <td className="px-5 py-4"><BooleanBadge value={school.eau} /></td>
                  <td className="px-5 py-4"><BooleanBadge value={school.electricite} /></td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-28 items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className={cn("h-2 rounded-full", school.completion > 90 ? "bg-emerald-500" : school.completion > 70 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${school.completion}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-500">{school.completion}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={school.statut} /></td>
                  <td className="px-5 py-4">{school.lastUpdate}</td>
                  <td className="px-5 py-4 print:hidden">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedSchool(school)}
                        title="Voir détails"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => setEditSchool(school)}
                        title="Modifier"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleValidate(school.code)}
                        disabled={school.statut === "Valide"}
                        title="Valider"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSchool(school.code)}
                        title="Supprimer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSchools.length === 0 && (
                <tr>
                  <td colSpan={19} className="text-center py-10 text-slate-400 font-bold">Aucun établissement ne correspond aux critères de filtrage.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between print:hidden">
          <span>Affichage de 1 a {filteredSchools.length} sur {schoolsList.length} etablissements</span>
          <div className="flex items-center gap-2">
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-400">Precedent</button>
            <button className="h-9 rounded-xl bg-indigo-600 px-3 font-black text-white">1</button>
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-400">Suivant</button>
          </div>
        </div>
      </section>

      {/* ─── MODAL: DETAILED VIEW (Eye) ─── */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setSelectedSchool(null)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full">{selectedSchool.type}</span>
                <h3 className="text-2xl font-black text-slate-950 mt-1">{selectedSchool.name}</h3>
                <p className="text-xs font-bold text-slate-400">Code: {selectedSchool.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Élèves Totaux</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.eleves}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{selectedSchool.filles} Filles / {selectedSchool.garcons} Garçons</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Personnel Enseignant</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.enseignants} Profs</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.enseignants)} élèves/prof</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Salles de classe</p>
                <p className="text-lg font-black text-slate-900 mt-1">{selectedSchool.salles} Salles</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{Math.round(selectedSchool.eleves / selectedSchool.salles)} élèves/salle</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Infrastructures & Services</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedSchool.eau === "Oui" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    <Droplets size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{selectedSchool.eau === "Oui" ? "Disponible" : "Non équipé"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedSchool.electricite === "Oui" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Électricité</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{selectedSchool.electricite === "Oui" ? "Disponible" : "Non raccordé"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 mb-8">
              <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">Localisation & Cycle</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Cycle</span>
                  <span className="text-slate-900">{selectedSchool.cycle}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
                  <span className="text-slate-900">{selectedSchool.region}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
                  <span className="text-slate-900">{selectedSchool.commune}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Quartier</span>
                  <span className="text-slate-900">{selectedSchool.quartier}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Complétude canevas:</span>
                <span className="text-sm font-black text-indigo-600">{selectedSchool.completion}%</span>
              </div>
              <div className="flex gap-2">
                {selectedSchool.statut !== "Valide" && (
                  <button 
                    onClick={() => { handleValidate(selectedSchool.code); setSelectedSchool(null); }}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Valider le canevas
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSchool(null)}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Ajouter un établissement</h3>
            
            <form onSubmit={handleAddSchool} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école *</label>
                  <input required value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ex: ETB-2026-999" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Ecole Commune V" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Public">Public</option>
                    <option value="Prive">Privé</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle</label>
                  <select value={newCycle} onChange={e => setNewCycle(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Prescolaire">Prescolaire</option>
                    <option value="Primaire">Primaire</option>
                    <option value="College">College</option>
                    <option value="Lycee">Lycee</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                  <select value={newCommune} onChange={e => setNewCommune(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Niamey I">Niamey I</option>
                    <option value="Niamey II">Niamey II</option>
                    <option value="Niamey III">Niamey III</option>
                    <option value="Niamey IV">Niamey IV</option>
                    <option value="Niamey V">Niamey V</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input value={newQuartier} onChange={e => setNewQuartier(e.target.value)} placeholder="Ex: Bobiel" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input type="number" value={newEleves} onChange={e => setNewEleves(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input type="number" value={newFilles} onChange={e => setNewFilles(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input type="number" value={newGarcons} onChange={e => setNewGarcons(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input type="number" value={newEnseignants} onChange={e => setNewEnseignants(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input type="number" value={newSalles} onChange={e => setNewSalles(Number(e.target.value))} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select value={newEau} onChange={e => setNewEau(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select value={newElectricite} onChange={e => setNewElectricite(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddOpen(false)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Créer l'établissement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT SCHOOL ─── */}
      {editSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-8 relative">
            <button 
              onClick={() => setEditSchool(null)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Modifier l'établissement</h3>
            
            <form onSubmit={handleEditSchoolSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code de l'école (Non modifiable)</label>
                  <input readOnly value={editSchool.code} className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl outline-none font-semibold text-slate-400 text-sm cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nom complet *</label>
                  <input required value={editSchool.name} onChange={e => setEditSchool({ ...editSchool, name: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                  <select value={editSchool.type} onChange={e => setEditSchool({ ...editSchool, type: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Public">Public</option>
                    <option value="Prive">Privé</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cycle</label>
                  <select value={editSchool.cycle} onChange={e => setEditSchool({ ...editSchool, cycle: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Prescolaire">Prescolaire</option>
                    <option value="Primaire">Primaire</option>
                    <option value="College">College</option>
                    <option value="Lycee">Lycee</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Commune</label>
                  <select value={editSchool.commune} onChange={e => setEditSchool({ ...editSchool, commune: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Niamey I">Niamey I</option>
                    <option value="Niamey II">Niamey II</option>
                    <option value="Niamey III">Niamey III</option>
                    <option value="Niamey IV">Niamey IV</option>
                    <option value="Niamey V">Niamey V</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quartier</label>
                  <input value={editSchool.quartier} onChange={e => setEditSchool({ ...editSchool, quartier: e.target.value })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Élèves</label>
                  <input type="number" value={editSchool.eleves} onChange={e => setEditSchool({ ...editSchool, eleves: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Filles</label>
                  <input type="number" value={editSchool.filles} onChange={e => setEditSchool({ ...editSchool, filles: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Garçons</label>
                  <input type="number" value={editSchool.garcons} onChange={e => setEditSchool({ ...editSchool, garcons: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Profs</label>
                  <input type="number" value={editSchool.enseignants} onChange={e => setEditSchool({ ...editSchool, enseignants: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salles</label>
                  <input type="number" value={editSchool.salles} onChange={e => setEditSchool({ ...editSchool, salles: Number(e.target.value) })} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Point d'eau</label>
                  <select value={editSchool.eau} onChange={e => setEditSchool({ ...editSchool, eau: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Électricité</label>
                  <select value={editSchool.electricite} onChange={e => setEditSchool({ ...editSchool, electricite: e.target.value })} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditSchool(null)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Sauvegarder les modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
