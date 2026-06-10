"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Shield, Users, CheckCircle2, BadgeCheck, CreditCard, Search, Filter, MoreVertical, Plus, Printer, ChevronDown, Sparkles, Undo2, Redo2, Check, ChevronLeft, Wand2, X, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getStudents } from "@/domains/students/actions/students.actions";
import { cn } from "@/lib/utils";
import { StudentCard } from "@/domains/id-cards/components/StudentCard";

const PRESET_COLORS = ["#4338CA", "#111827", "#7F1D1D", "#064E3B", "#0369A1", "#6D28D9"];
const BG_GRADIENTS = [
  "linear-gradient(135deg, #4338CA 0%, #1E1B4B 100%)",
  "linear-gradient(135deg, #1F2937 0%, #030712 100%)",
  "linear-gradient(135deg, #047857 0%, #064E3B 100%)",
  "linear-gradient(135deg, #BE123C 0%, #881337 100%)",
  "linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)",
];

const FONTS = ["Poppins", "Inter", "Roboto", "Arial", "Georgia"];

export default function IdCardsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "selected" | "no-photo">("all");
  const [activeTab, setActiveTab] = useState<"design" | "données" | "impression">("design");
  const [viewSide, setViewSide] = useState<"recto" | "verso">("recto");
  const [themeColor, setThemeColor] = useState(PRESET_COLORS[0]);
  const [fontFamily, setFontFamily] = useState("Poppins");
  const [cornerRadius, setCornerRadius] = useState(16);
  const [shadowIntensity, setShadowIntensity] = useState(20);
  const [activeBg, setActiveBg] = useState(BG_GRADIENTS[0]);
  const [schoolName, setSchoolName] = useState("ÉCOLE AL AAL");
  const [schoolCountry, setSchoolCountry] = useState("RÉPUBLIQUE DU SÉNÉGAL");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getStudents().then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (data) setStudents(data);
      setLoading(false);
    });
  }, []);

  const filteredStudents = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    const match = s.nomEtudiant?.toLowerCase().includes(q) || s.numAdmission?.toLowerCase().includes(q);
    if (filter === "selected") return match && selectedIds.includes(s.id);
    if (filter === "no-photo") return match && !s.photoPath;
    return match;
  }), [students, search, filter, selectedIds]);

  const activeStudent = useMemo(() => {
    const s = selectedIds.length > 0 ? students.find(st => st.id === selectedIds[0]) : (students[0] ?? null);
    if (s && s.photoPath && (s.photoPath.startsWith("C:") || s.photoPath.startsWith("file:"))) {
      return { ...s, photoPath: `/api/files?path=${encodeURIComponent(s.photoPath)}` };
    }
    // If it's already a URL (e.g. from Supabase), return it as is
    if (s && s.photoPath && s.photoPath.startsWith("http")) {
      return s;
    }
    return s;
  }, [selectedIds, students]);

  const toggle = (id: number) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filteredStudents.length ? [] : filteredStudents.map(s => s.id));

  const [printing, setPrinting] = useState(false);

  const cleanStylesForPrinting = () => {
    // Aggressive cleaner: Scan every element and replace modern colors with legacy-compatible ones
    const allElements = document.querySelectorAll("*");
    
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      
      // Get computed styles - this is where the browser resolves oklch
      const style = window.getComputedStyle(htmlEl);
      
      const propsToClean = ["backgroundColor", "color", "borderColor", "borderBottomColor", "borderTopColor", "borderLeftColor", "borderRightColor", "outlineColor", "backgroundImage"];
      
      propsToClean.forEach((prop) => {
        const value = (style as any)[prop];
        if (value && (value.includes("oklch") || value.includes("oklab") || value.includes("lab("))) {
          // Force a safe fallback directly on the element style attribute
          if (prop === "backgroundColor") htmlEl.style.setProperty(prop, "#ffffff", "important");
          else if (prop === "color") htmlEl.style.setProperty(prop, "#000000", "important");
          else if (prop.includes("border")) htmlEl.style.setProperty(prop, "#dddddd", "important");
          else if (prop === "backgroundImage") htmlEl.style.setProperty(prop, "none", "important");
        }
      });
    });
  };

  const handlePrint = async () => {
    if (selectedIds.length === 0) {
      toast.error("Sélectionnez au moins un élève");
      return;
    }

    setPrinting(true);
    const toastId = toast.loading(`Impression en cours (${selectedIds.length} élèves)...`);

    // --- STEP 1: HEAD PURGE ---
    // Physically remove all stylesheets from HEAD to prevent html2canvas from crashing
    const head = document.head;
    const originalStyles = Array.from(head.querySelectorAll('style, link[rel="stylesheet"]'));
    originalStyles.forEach(node => node.remove());

    // Inject "Safety CSS" for cards only
    const safetyStyle = document.createElement('style');
    safetyStyle.id = "safety-css";
    safetyStyle.innerHTML = `
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
      body { background: white; margin: 0; padding: 0; }
      .print-card { page-break-after: always; }
    `;
    head.appendChild(safetyStyle);

    try {
      // ── ISO CR80 : 85.6 × 54 mm  ──
      // A4 Landscape : 297 × 210 mm
      // Layout      : 3 cols × 3 rows = 9 cards / page
      const CARD_W = 85.6;   // mm  (CR80 width)
      const CARD_H = 54;     // mm  (CR80 height)
      const COLS   = 3;
      const ROWS   = 3;
      const CARDS_PER_PAGE = COLS * ROWS;  // 9
      const GAP_X  = 5;      // mm between columns
      const GAP_Y  = 6;      // mm between rows

      // A4 Landscape: width=297, height=210
      const PAGE_W = 297;
      const PAGE_H = 210;

      // Centered grid
      const gridW  = COLS * CARD_W + (COLS - 1) * GAP_X;  // 256.8 + 10 = 266.8 mm
      const gridH  = ROWS * CARD_H + (ROWS - 1) * GAP_Y;  // 162 + 12 = 174 mm
      const marginX = (PAGE_W - gridW) / 2;  // ~15.1 mm
      const marginY = (PAGE_H - gridH) / 2;  // ~18 mm

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      doc.setProperties({
        title: `Cartes ID — ${new Date().toLocaleDateString("fr-FR")}`,
        subject: `${selectedIds.length} carte(s) élève`,
        creator: "EDUT Studio Cartes ID",
      });

      const selectedStudents = students.filter(s => selectedIds.includes(s.id));

      // Helper: draw precise cut-corner marks
      const drawCutMarks = (x: number, y: number) => {
        const L = 3, G = 1;
        doc.setDrawColor(150);
        doc.setLineWidth(0.15);
        // Top-left
        doc.line(x - G - L, y, x - G, y);
        doc.line(x, y - G - L, x, y - G);
        // Top-right
        doc.line(x + CARD_W + G, y, x + CARD_W + G + L, y);
        doc.line(x + CARD_W, y - G - L, x + CARD_W, y - G);
        // Bottom-left
        doc.line(x - G - L, y + CARD_H, x - G, y + CARD_H);
        doc.line(x, y + CARD_H + G, x, y + CARD_H + G + L);
        // Bottom-right
        doc.line(x + CARD_W + G, y + CARD_H, x + CARD_W + G + L, y + CARD_H);
        doc.line(x + CARD_W, y + CARD_H + G, x + CARD_W, y + CARD_H + G + L);
      };

      for (let i = 0; i < selectedStudents.length; i += CARDS_PER_PAGE) {
        const batch = selectedStudents.slice(i, i + CARDS_PER_PAGE);
        if (i > 0) doc.addPage();

        // ── RECTO PAGE ──
        for (let j = 0; j < batch.length; j++) {
          const student = batch[j];
          const col = j % COLS;
          const row = Math.floor(j / COLS);
          const x = marginX + col * (CARD_W + GAP_X);
          const y = marginY + row * (CARD_H + GAP_Y);

          const el = document.getElementById(`print-card-recto-${student.id}`);
          if (!el) continue;

          const canvas = await html2canvas(el, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 15000,
          });

          doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, y, CARD_W, CARD_H);
          drawCutMarks(x, y);
        }

        // ── VERSO PAGE (columns mirrored for long-edge duplex flip) ──
        doc.addPage();
        for (let j = 0; j < batch.length; j++) {
          const student = batch[j];
          const col = j % COLS;
          const row = Math.floor(j / COLS);
          const mirroredCol = (COLS - 1) - col;
          const x = marginX + mirroredCol * (CARD_W + GAP_X);
          const y = marginY + row * (CARD_H + GAP_Y);

          const el = document.getElementById(`print-card-verso-${student.id}`);
          if (!el) continue;

          const canvas = await html2canvas(el, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 15000,
          });

          doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, y, CARD_W, CARD_H);
          drawCutMarks(x, y);
        }
      }

      // Download
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Edut_ID_Cards_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ ${selectedIds.length} carte(s) — PDF Landscape prêt !`, { id: toastId });

    } catch (error) {
      console.error("CRITICAL PDF ERROR:", error);
      toast.error("Échec de la génération PDF. Vérifiez la console.", { id: toastId });
    } finally {
      safetyStyle.remove();
      originalStyles.forEach(node => head.appendChild(node));
      setPrinting(false);
    }
  };

  const cardProps = { themeColor, bgGradient: activeBg, cornerRadius, shadowIntensity, fontFamily, schoolName, schoolCountry, academicYear };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 pb-28">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 leading-none">Studio Cartes ID</h1>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Pro</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Concevez, personnalisez et imprimez des cartes d'identité professionnelles</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} disabled={printing} className="h-9 pl-4 pr-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
            {printing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Printer size={16} className="mr-2" />} 
            {printing ? "Génération..." : `Imprimer (${selectedIds.length})`}
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: <Users size={20} />, color: "indigo", label: "Élèves sélectionnés", value: `${selectedIds.length} / ${students.length}` },
          { icon: <CheckCircle2 size={20} />, color: "emerald", label: "Avec photo", value: students.filter(s => s.photoPath).length },
          { icon: <BadgeCheck size={20} />, color: "blue", label: "Qualité impression", value: "300 DPI" },
          { icon: <CreditCard size={20} />, color: "purple", label: "Format / Orientation", value: "A4 Paysage" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full bg-${k.color}-50 flex items-center justify-center text-${k.color}-600`}>{k.icon}</div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-0.5">{k.label}</p>
              <p className="text-lg font-bold text-slate-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 h-[calc(100vh-260px)] min-h-[560px]">

        {/* Left - Student List */}
        <div className="w-[300px] bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Sélection des Élèves</h2>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md">{selectedIds.length} sél.</span>
          </div>
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input placeholder="Nom ou matricule..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 rounded-xl bg-slate-50 border-transparent text-xs" />
            </div>
            <div className="flex p-0.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-semibold">
              {(["all", "selected", "no-photo"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn("flex-1 py-1 rounded transition-all", filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>
                  {f === "all" ? `Tous (${students.length})` : f === "selected" ? `Sél. (${selectedIds.length})` : "Sans photo"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Chargement...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Aucun élève trouvé</div>
            ) : filteredStudents.map(s => {
              const sel = selectedIds.includes(s.id);
              return (
                <div key={s.id} onClick={() => toggle(s.id)} className={cn("flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border", sel ? "bg-indigo-50/60 border-indigo-100" : "border-transparent hover:bg-slate-50")}>
                  <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all", sel ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white")}>
                    {sel && <Check size={10} className="text-white" />}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                    {s.photoPath ? (
                      <img 
                        src={s.photoPath.startsWith("http") ? s.photoPath : `/api/files?path=${encodeURIComponent(s.photoPath)}`} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">✗</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{s.nomEtudiant}</p>
                    <p className="text-[10px] text-slate-500">{s.classe || "—"} · {s.numAdmission}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", s.photoPath ? "bg-emerald-500" : "bg-orange-400")} />
                      <span className={cn("text-[9px] font-medium", s.photoPath ? "text-emerald-600" : "text-orange-500")}>{s.photoPath ? "Prêt" : "Photo manquante"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-slate-100">
            <button onClick={toggleAll} className="w-full text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 py-1">
              {selectedIds.length === filteredStudents.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex px-6 pt-4 border-b border-slate-100">
            {(["Design", "Données", "Impression"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase() as any)} className={cn("px-4 pb-3 text-sm font-bold relative transition-colors", activeTab === tab.toLowerCase() ? "text-indigo-600" : "text-slate-500 hover:text-slate-700")}>
                {tab}
                {activeTab === tab.toLowerCase() && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          {activeTab === "design" && (
            <>
              {/* Side Toggle */}
              <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100">
                {(["recto", "verso"] as const).map(side => (
                  <button key={side} onClick={() => setViewSide(side)} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all border", viewSide === side ? "bg-indigo-600 text-white border-indigo-600" : "text-slate-500 border-slate-200 hover:bg-slate-50")}>
                    {side.charAt(0).toUpperCase() + side.slice(1)}
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-400">PVC Standard · 85.6 × 54 mm · 300 DPI</span>
              </div>

              {/* Canvas */}
              <div className="flex-1 bg-[#F1F5F9] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={viewSide} initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -90 }} transition={{ duration: 0.3 }}>
                    {activeStudent ? (
                      <StudentCard student={activeStudent} side={viewSide} {...cardProps} />
                    ) : (
                      <div className="text-slate-400 text-sm">Aucun élève sélectionné</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Template strip */}
              <div className="h-24 bg-white border-t border-slate-100 px-6 py-3 flex items-center gap-3 overflow-x-auto">
                {BG_GRADIENTS.map((bg, i) => (
                  <button key={i} onClick={() => setActiveBg(bg)} className={cn("h-full aspect-[1.58] rounded-lg border-2 shrink-0 transition-all", activeBg === bg ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200")} style={{ background: bg }} />
                ))}
                <div className="h-full aspect-[1.58] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer shrink-0 transition-all">
                  <Plus size={18} />
                </div>
              </div>
            </>
          )}

          {activeTab === "données" && (
            <div className="flex-1 overflow-y-auto p-8">
              {activeStudent ? (
                <div className="max-w-lg mx-auto space-y-6">
                  <h3 className="font-bold text-slate-900">Données de la carte — {activeStudent.nomEtudiant}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      ["N° Admission", activeStudent.numAdmission],
                      ["Classe", activeStudent.classe],
                      ["Section", activeStudent.section],
                      ["Sexe", activeStudent.sexe],
                      ["Date naissance", activeStudent.dateNaissance],
                      ["Lieu naissance", activeStudent.lieuNaissance],
                      ["Groupe sanguin", activeStudent.groupeSanguin],
                      ["Téléphone", activeStudent.mobile],
                      ["Père", activeStudent.nomPere],
                      ["Statut", activeStudent.statut],
                    ].map(([label, val]) => (
                      <div key={label as string} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="font-bold text-slate-900 text-xs">{val || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">Sélectionnez un élève pour voir ses données</div>
              )}
            </div>
          )}

          {activeTab === "impression" && (
            <div className="flex-1 p-8">
              <div className="max-w-lg mx-auto space-y-6">
                <h3 className="font-bold text-slate-900">Paramètres d'impression</h3>
                <div className="space-y-3">
                  {[
                    ["Format", "A4 Paysage (Landscape)"],
                    ["Résolution", "300 DPI — Qualité excellente"],
                    ["Cartes sélectionnées", `${selectedIds.length} élève(s)`],
                    ["Mise en page", "3 colonnes × 3 lignes = 9 cartes/page"],
                    ["Recto/Verso", "Activé — Retournement bord long"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="font-bold text-slate-900">{val}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handlePrint} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">
                  <Printer size={18} className="mr-2" /> Lancer l'impression ({selectedIds.length} cartes)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right - Personalization */}
        <div className="w-[260px] bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Personnalisation</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

            {/* School Name */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nom de l'école</label>
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} className="h-9 text-xs rounded-lg" />
            </div>

            {/* Country */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Pays / Institution</label>
              <Input value={schoolCountry} onChange={e => setSchoolCountry(e.target.value)} className="h-9 text-xs rounded-lg" />
            </div>

            {/* Year */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Année scolaire</label>
              <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="h-9 text-xs rounded-lg" placeholder="2024-2025" />
            </div>

            {/* Theme color */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Couleur du thème</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setThemeColor(c)} className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all", themeColor === c ? "border-slate-400 scale-110" : "border-transparent")} style={{ background: c }}>
                    {themeColor === c && <Check size={10} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Police</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full h-9 border border-slate-200 rounded-lg px-3 text-xs font-medium bg-white">
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Corner Radius */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">Coins arrondis</label>
                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{cornerRadius}px</span>
              </div>
              <input type="range" min={0} max={40} value={cornerRadius} onChange={e => setCornerRadius(+e.target.value)} className="w-full accent-indigo-600" />
            </div>

            {/* Shadow */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">Ombre portée</label>
                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{shadowIntensity}%</span>
              </div>
              <input type="range" min={0} max={50} value={shadowIntensity} onChange={e => setShadowIntensity(+e.target.value)} className="w-full accent-indigo-600" />
            </div>

          </div>
          <div className="p-4 border-t border-slate-100">
            <Button onClick={() => { setThemeColor(PRESET_COLORS[Math.floor(Math.random()*PRESET_COLORS.length)]); setActiveBg(BG_GRADIENTS[Math.floor(Math.random()*BG_GRADIENTS.length)]); toast.success("Design IA généré !"); }} className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2">
              <Sparkles size={14} /> Générer design IA
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Print Capture Area — must be visible to html2canvas but off-screen */}
      <div
        id="print-capture-area"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          zIndex: -1,
          pointerEvents: "none",
          // Do NOT use opacity:0 — html2canvas captures blank on hidden elements
        }}
      >
        {students.filter(s => selectedIds.includes(s.id)).map(student => (
          <div key={student.id} style={{ marginBottom: 8 }}>
            <div id={`print-card-recto-${student.id}`} style={{ display: "inline-block" }}>
              <StudentCard student={student} side="recto" {...cardProps} />
            </div>
            <div id={`print-card-verso-${student.id}`} style={{ display: "inline-block" }}>
              <StudentCard student={student} side="verso" {...cardProps} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-xl px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Users size={16} className="text-indigo-600" />
          <span className="font-bold text-slate-900">{selectedIds.length}</span> élève(s) sélectionné(s)
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={toggleAll} className="h-10 rounded-xl font-semibold px-5 border-slate-200">
            {selectedIds.length === filteredStudents.length ? "Tout désélectionner" : "Tout sélectionner"}
          </Button>
          <Button variant="outline" onClick={() => setSelectedIds([])} className="h-10 rounded-xl font-semibold px-4 border-rose-200 text-rose-600 hover:bg-rose-50">
            <X size={16} className="mr-1" /> Réinitialiser
          </Button>
          <Button onClick={handlePrint} disabled={printing} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg flex items-center gap-2">
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} 
            {printing ? "Génération..." : `Imprimer ${selectedIds.length > 0 ? `(${selectedIds.length})` : "les cartes"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
