"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Printer,
  Mail,
  Search,
  Filter,
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  CheckCircle2,
  FileSpreadsheet,
  X,
  MapPin,
  FileDown,
  Info,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// List of 16 required reports
const reportTypes = [
  { id: "global", label: "Rapport global des établissements", desc: "Synthèse générale de toutes les structures scolaires" },
  { id: "identification", label: "Rapport identification", desc: "Informations d'identification administrative des écoles" },
  { id: "effectifs", label: "Rapport effectifs élèves", desc: "Nombre d'élèves par niveau et par cycle" },
  { id: "filles_garcons", label: "Rapport filles/garçons", desc: "Indice de parité et répartition par genre" },
  { id: "redoublants", label: "Rapport redoublants", desc: "Statistiques de redoublement par classe et genre" },
  { id: "personnel", label: "Rapport personnel", desc: "Nombre d'enseignants, directeurs et statuts professionnels" },
  { id: "infrastructures", label: "Rapport infrastructures", desc: "État des salles de classe, bureaux et équipements" },
  { id: "mobilier", label: "Rapport mobilier", desc: "Disponibilité des tables-bancs, armoires et chaises" },
  { id: "manuels", label: "Rapport manuels", desc: "Ratio de manuels scolaires par élève et discipline" },
  { id: "guides", label: "Rapport guides", desc: "Disponibilité des guides pédagogiques pour enseignants" },
  { id: "besoins", label: "Rapport besoins", desc: "Synthèse des besoins prioritaires formulés par les écoles" },
  { id: "public_prive", label: "Rapport public/privé", desc: "Comparatif sectoriel public et privé" },
  { id: "commune", label: "Rapport par commune", desc: "Répartition géographique et synthèse par commune" },
  { id: "inspection", label: "Rapport par inspection", desc: "Synthèse par Inspection de l'Enseignement (IEFA)" },
  { id: "qualite", label: "Rapport contrôle qualité", desc: "Taux de complétude et détection des anomalies de saisie" },
  { id: "non_mappe", label: "Rapport données non mappées", desc: "Champs bruts conservés lors des imports Excel" },
];

const mockResults = [
  { code: "REP-001", name: "Rapport Synthèse Régionale", type: "Global", year: "2025 - 2026", zone: "Urbaine", status: "Prêt", date: "28/06/2026" },
  { code: "REP-002", name: "Indicateurs d'Infrastructure", type: "Infrastructures", year: "2025 - 2026", zone: "Rurale", status: "Prêt", date: "27/06/2026" },
  { code: "REP-003", name: "Répartition Filles/Garçons", type: "Genre", year: "2025 - 2026", zone: "Toutes", status: "Prêt", date: "26/06/2026" },
  { code: "REP-004", name: "Besoins en Mobilier Scolaire", type: "Besoins", year: "2025 - 2026", zone: "Toutes", status: "En cours", date: "25/06/2026" },
  { code: "REP-005", name: "Contrôle Qualité Saisie", type: "Qualité", year: "2024 - 2025", zone: "Urbaine", status: "Prêt", date: "14/06/2026" },
];

export default function ReportingCentrePage() {
  const [selectedReport, setSelectedReport] = useState("global");
  
  // Filters state
  const [year, setYear] = useState("2025 - 2026");
  const [region, setRegion] = useState("Niamey");
  const [commune, setCommune] = useState("Toutes");
  const [inspection, setInspection] = useState("Toutes");
  const [establishment, setEstablishment] = useState("");
  const [status, setStatus] = useState("Toutes");
  const [type, setType] = useState("Tous");
  const [zone, setZone] = useState("Toutes");
  const [cycle, setCycle] = useState("Tous");
  const [level, setLevel] = useState("Tous");

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const activeReport = reportTypes.find((r) => r.id === selectedReport) || reportTypes[0];

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    toast.success(`Exportation du "${activeReport.label}" au format ${format.toUpperCase()} en cours...`);
    
    // Simulate file generation
    const content = `Rapport: ${activeReport.label}\nAnnée: ${year}\nRégion: ${region}\nGénéré le: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeReport.id}_report.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    toast.success(`Rapport "${activeReport.label}" envoyé avec succès à ${recipientEmail}`);
    setEmailModalOpen(false);
    setRecipientEmail("");
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0 print:text-black">
      
      {/* ─── OFFICIAL PRINT HEADER (Visible only on print) ─── */}
      <div className="hidden print:block w-full border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-start text-xs font-bold uppercase">
          <div className="text-center space-y-1">
            <p>République du Niger</p>
            <p>Ministère de l'Éducation Nationale</p>
            <p>Secrétariat Général</p>
            <p>Direction des Statistiques</p>
          </div>
          <div className="text-center space-y-1">
            <p>Année Scolaire: {year}</p>
            <p>Région: {region}</p>
            <p>Inspection: {inspection}</p>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <h1 className="text-2xl font-black uppercase tracking-wide decoration-double underline decoration-1">
            {activeReport.label}
          </h1>
          <p className="text-sm font-bold text-slate-700 mt-2 lowercase first-letter:uppercase">{activeReport.desc}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-xs font-bold">
          <div>Date d'impression: {new Date().toLocaleDateString("fr-FR")}</div>
          <div className="text-center">Généré par: Administrateur</div>
          <div className="text-right">Statut des données: Validé</div>
        </div>
      </div>

      {/* ─── WEB HEADER (Hidden on print) ─── */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Centre de Reporting</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Générez des rapports synthétiques sur mesure</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => handleExport("pdf")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <FileDown size={15} /> PDF
            </button>
            <button 
              onClick={() => handleExport("excel")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button 
              onClick={() => handleExport("csv")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={15} /> CSV
            </button>
            <button 
              onClick={() => setEmailModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Mail size={15} /> Email
            </button>
            <button 
              onClick={() => window.print()}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* ─── STATISTICAL CARDS ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Rapports configurés", value: "16 types", sub: "100% complets", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Données analysées", value: "806 structures", sub: "Écoles publiques + privées", icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Taux de complétude", value: "87%", sub: "Objectif national 95%", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Élèves comptabilisés", value: "142 416", sub: "Effectif cumulé", icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm print:border-slate-300">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", c.bg, c.color)}>
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:hidden">2025-2026</span>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{c.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{c.sub}</p>
            </div>
          );
        })}
      </section>

      {/* ─── FILTERS PANEL ─── */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={17} className="text-indigo-600" />
          <h2 className="text-sm font-black text-slate-900">Filtres du rapport</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Année Scolaire</span>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="2025 - 2026">2025 - 2026</option>
              <option value="2024 - 2025">2024 - 2025</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Niamey">Niamey</option>
              <option value="Maradi">Maradi</option>
              <option value="Zinder">Zinder</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
            <select value={commune} onChange={(e) => setCommune(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Toutes</option>
              <option value="Niamey I">Niamey I</option>
              <option value="Niamey II">Niamey II</option>
              <option value="Niamey III">Niamey III</option>
              <option value="Niamey IV">Niamey IV</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Inspection</span>
            <select value={inspection} onChange={(e) => setInspection(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Toutes</option>
              <option value="IEFA I">IEFA I</option>
              <option value="IEFA II">IEFA II</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Établissement</span>
            <input value={establishment} onChange={(e) => setEstablishment(e.target.value)} placeholder="Ex: Bobiel" className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Statut Canevas</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Tous</option>
              <option value="Valide">Validé</option>
              <option value="A verifier">A vérifier</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Type Établissement</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Tous">Tous</option>
              <option value="Public">Public</option>
              <option value="Prive">Privé</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Zone</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Toutes">Toutes</option>
              <option value="Urbaine">Urbaine</option>
              <option value="Rurale">Rurale</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Cycle</span>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Tous">Tous</option>
              <option value="Prescolaire">Préscolaire</option>
              <option value="Primaire">Primaire</option>
              <option value="Secondaire">Secondaire</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Niveau d'étude</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 text-xs bg-white">
              <option value="Tous">Tous</option>
              <option value="CI">CI</option>
              <option value="CP">CP</option>
              <option value="CE1">CE1</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT GRID ─── */}
      <section className="grid gap-5 xl:grid-cols-[280px_1fr]">
        
        {/* Left pane: Report selector (Hidden on print) */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm print:hidden max-h-[700px] overflow-y-auto custom-scrollbar">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 px-2">Liste des rapports</h2>
          <div className="space-y-1.5">
            {reportTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition text-xs font-bold leading-normal cursor-pointer",
                  selectedReport === r.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <p className="font-black truncate">{r.label}</p>
                <p className={cn("text-[10px] mt-0.5 font-medium truncate", selectedReport === r.id ? "text-indigo-100" : "text-slate-400")}>
                  {r.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right pane: Report visualization / table */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm print:border-none print:shadow-none">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">{activeReport.label}</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">{activeReport.desc}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 print:hidden">
              <Info size={14} className="text-indigo-600" />
              <span>Aperçu en temps réel</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm print:border print:border-slate-300">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-black">
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Intitulé du rapport</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Année Scolaire</th>
                  <th className="px-4 py-3.5">Zone géographique</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-4 py-3.5">Dernière génération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                {mockResults.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/50 transition font-bold text-slate-700 print:text-black">
                    <td className="px-4 py-4 text-indigo-600 font-black">{row.code}</td>
                    <td className="px-4 py-4 text-slate-900">{row.name}</td>
                    <td className="px-4 py-4 font-normal text-xs text-slate-500">{row.type}</td>
                    <td className="px-4 py-4">{row.year}</td>
                    <td className="px-4 py-4 text-xs">{row.zone}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                        row.status === "Prêt" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700"
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-normal text-slate-400">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-400 font-bold print:hidden">
            <span>Affichage de 1 à 5 sur 24 versions</span>
            <div className="flex gap-1.5">
              <button disabled className="h-8 px-3 rounded-lg border border-slate-200 text-slate-400">Précédent</button>
              <button className="h-8 w-8 rounded-lg bg-indigo-600 text-white">1</button>
              <button className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600">2</button>
              <button className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600">Suivant</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRINT FOOTER & SIGNATURES ─── */}
      <div className="hidden print:block w-full mt-24 pt-8 border-t border-dashed border-slate-400">
        <div className="grid grid-cols-3 gap-8 text-center text-xs font-bold">
          <div>
            <p className="underline mb-12">Signature du Directeur d'Établissement</p>
            <div className="h-20 w-44 border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Signature & Cachet</div>
          </div>
          <div>
            <p className="underline mb-12">Cachet de l'Inspection IEFA</p>
            <div className="h-20 w-44 border border-dashed border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 italic">Cachet de conformité</div>
          </div>
          <div>
            <p className="underline mb-12">Vérification QR Code</p>
            <div className="w-20 h-20 border border-slate-300 mx-auto flex items-center justify-center bg-slate-50 text-[10px] font-mono text-slate-500">
              [QR CODE]
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-mono">ID: {activeReport.id}-2026-NGR</p>
          </div>
        </div>
      </div>

      {/* ─── EMAIL DIALOG MODAL ─── */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.2rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setEmailModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-950 mb-2">Envoyer le rapport par Email</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">Destinataire recevra un rapport PDF conforme à l'année {year}.</p>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Adresse Email du destinataire *</label>
                <input 
                  required 
                  type="email"
                  value={recipientEmail} 
                  onChange={e => setRecipientEmail(e.target.value)} 
                  placeholder="inspecteur@ministere.gouv.ne" 
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs">Annuler</button>
                <button type="submit" className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100">Envoyer le mail</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
