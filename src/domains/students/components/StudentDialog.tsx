"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent, updateStudent } from "@/domains/students/actions/students.actions";
import { createNotification } from "@/domains/messaging/actions/notifications.actions";
import { StudentFormData } from "../validators/student.schema";
import { getClasses, getSections, getEducationalLevels, getSessions } from "@/domains/academics/actions/academics.actions";
import { Camera, Upload, Zap, X, Check, User, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { resolveOnlineOrCached } from "@/infrastructure/local-db/references";

interface StudentDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function StudentDialog({ mode = "add", initialData, trigger }: StudentDialogProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutate } = useOfflineMutation<StudentFormData & { id?: number }>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [step, setStep] = useState(1);

  const close = useCallback(() => { setOpen(false); setStep(1); }, []);

  // ── Cascading select state ────────────────────────────────────────────────
  const [selectedLevel,   setSelectedLevel]   = useState(initialData?.educationalLevel || "");
  const [selectedClasse,  setSelectedClasse]  = useState(initialData?.classe  || "");
  const [selectedSection, setSelectedSection] = useState(initialData?.section || "");

  // ── Raw data from DB ──────────────────────────────────────────────────────
  const [sessionsList,    setSessionsList]    = useState<any[]>([]);
  const [levelsList,      setLevelsList]      = useState<any[]>([]);
  const [allClassesList,  setAllClassesList]  = useState<any[]>([]);
  const [allSectionsList, setAllSectionsList] = useState<any[]>([]);

  // ── Derived (filtered) lists ──────────────────────────────────────────────
  const [classesList,  setClassesList]  = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  // ── Load everything once when the dialog opens ────────────────────────────
  useEffect(() => {
    if (!open) return;

    // 1. Sessions from school_sessions table
    resolveOnlineOrCached("session", () => getSessions(), "sessionName").then(setSessionsList);

    // 2. Levels — ignoreActiveFilter=true → ALL levels from Paramètres → Académique
    getEducationalLevels(true).then(res => {
      if (res.success && res.data) {
        setLevelsList(Array.isArray(res.data) ? res.data : []);
      }
    });

    // 3. All classes (with optional section.educationalLevel field)
    resolveOnlineOrCached("class", () => getClasses(true), "className").then(raw => {
      setAllClassesList(raw);
      setClassesList(raw); // show all before a level is chosen
    });

    // 4. All sections
    resolveOnlineOrCached("section", () => getSections(true), "sectionName").then(raw => {
      setAllSectionsList(raw);
      setSectionsList(raw);
    });
  }, [open]);

  // ── Cascade filter when level changes → update classes & sections ─────────
  useEffect(() => {
    if (!selectedLevel) {
      // No level → show full lists
      setClassesList(allClassesList);
      setSectionsList(allSectionsList);
      return;
    }

    // Filter classes by educational level (support both joined and flat structures)
    const fc = allClassesList.filter(c =>
      c.section?.educationalLevel === selectedLevel ||
      c.educationalLevel          === selectedLevel
    );
    setClassesList(fc.length > 0 ? fc : allClassesList);

    // Filter sections
    const fs = allSectionsList.filter(s => s.educationalLevel === selectedLevel);
    setSectionsList(fs.length > 0 ? fs : allSectionsList);

    // Reset child dropdowns
    if (mode === "add" || selectedLevel !== initialData?.educationalLevel) {
      setSelectedClasse("");
      setSelectedSection("");
    }
  }, [selectedLevel, allClassesList, allSectionsList]);

  // Sync photo preview when initialData changes
  useEffect(() => {
    setPreview(initialData?.photoPath || null);
  }, [initialData]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Photo states
  const [preview, setPreview] = useState<string | null>(initialData?.photoPath || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsCameraOpen(false);
      if (err.name === "NotAllowedError") {
        setCameraError("Accès caméra refusé. Veuillez autoriser la caméra dans votre navigateur.");
      } else {
        setCameraError("Impossible d'accéder à la caméra. Vérifiez qu'elle n'est pas utilisée par une autre application.");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setPreview(dataUrl);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleFinalSubmit() {
    if (!formRef.current) return;
    setLoading(true);
    setError("");

    const form = new FormData(formRef.current);
    const numAdmission = form.get("numAdmission") as string;
    
    let photoPath = preview || "";

    // If online, upload the new photo to Supabase. Offline mode keeps the data URL locally.
    if (isOnline && preview && preview.startsWith("data:image")) {
      try {
        const { uploadStudentPhoto } = await import("@/shared/utils/supabase/storage");
        const fileName = `${numAdmission}_${Date.now()}.jpg`;
        photoPath = await uploadStudentPhoto(preview, fileName);
      } catch (err: any) {
        console.error("Detailed Upload Error:", err);
        const errorMsg = err.message || "Erreur inconnue";
        setError(`Erreur de photo : ${errorMsg}. Vérifiez que le bucket 'student-photos' existe dans Supabase.`);
        setLoading(false);
        return;
      }
    }

    const data: StudentFormData = {
      numAdmission,
      nomEtudiant: form.get("nomEtudiant") as string,
      nomArabe: form.get("nomArabe") as string,
      sexe: form.get("sexe") as "Garçon" | "Fille",
      religion: form.get("religion") as string,
      dateNaissance: form.get("dateNaissance") as string,
      lieuNaissance: form.get("lieuNaissance") as string,
      cnic: form.get("cnic") as string,
      groupeSanguin: form.get("groupeSanguin") as string,

      session: form.get("session") as string,
      educationalLevel: form.get("educationalLevel") as string,
      classe: form.get("classe") as string,
      section: form.get("section") as string,
      categorie: form.get("categorie") as string,

      nomPere: form.get("nomPere") as string,
      cnicPere: form.get("cnicPere") as string,
      mobile: form.get("mobile") as string,
      whatsapp: form.get("whatsapp") as string,

      fraisMensuels: Number(form.get("fraisMensuels")) || 0,
      ancienSolde: Number(form.get("ancienSolde")) || 0,
      fraisInscription: Number(form.get("fraisInscription")) || 0,
      fraisCogesCard: Number(form.get("fraisCogesCard")) || 0,
      fraisTransportInternat: Number(form.get("fraisTransportInternat")) || 0,

      statut: (form.get("statut") as string) || "Actif",
      behaviorScore: Number(form.get("behaviorScore")) || 0,
      photoPath: photoPath,
    };

    const payload = mode === "edit" && initialData?.id ? { ...data, id: initialData.id } : data;
    const result = await mutate(payload, {
      targetTable: "students",
      onlineAction: async (studentPayload) => {
        const { id, ...studentData } = studentPayload;
        return id ? updateStudent(id, studentData) : createStudent(studentData);
      },
    });

    setLoading(false);

    if (result.success) {
      // Send Smart Notification
      try {
        await createNotification({
          title: mode === "edit" ? "Dossier Étudiant Mis à Jour" : "Nouvelle Inscription",
          content: mode === "edit" 
            ? `Le dossier de ${data.nomEtudiant} (${data.numAdmission}) a été modifié avec succès.`
            : `L'élève ${data.nomEtudiant} a été inscrit avec succès en classe de ${data.classe}.`,
          type: "success",
          category: "system"
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      setOpen(false);
      setStep(1);
      router.refresh(); // Ensure the page data is re-fetched
    } else if (result.error) {
      setError(result.error);
    }
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const STEPS = [
    { n: 1, t: "Profil Élève",    d: "Identité & Photo",  color: "bg-indigo-500",  ring: "ring-indigo-300" },
    { n: 2, t: "Dossier Famille", d: "Parents & Contact", color: "bg-violet-500",  ring: "ring-violet-300" },
    { n: 3, t: "Plan Financier",  d: "Scolarité & Bourse",color: "bg-emerald-500", ring: "ring-emerald-300" },
  ];

  const modal = open ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        style={{ height: "90vh", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-64 bg-slate-900 flex flex-col justify-between shrink-0 hidden md:flex">
          {/* Top branding */}
          <div className="p-8 space-y-10">
            <div>
              <h2 className="text-white text-3xl font-black tracking-tighter leading-tight italic">
                GS PRO<br /><span className="text-indigo-400 not-italic">STUDENT</span>
              </h2>
              <div className="h-1.5 w-12 bg-indigo-500 mt-4 rounded-full" />
            </div>

            {/* Step navigation */}
            <nav className="space-y-5">
              {STEPS.map((s) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                  <div key={s.n} className={`flex items-center gap-4 transition-all duration-300 ${active ? "translate-x-2" : "opacity-40 hover:opacity-60"}`}>
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all
                      ${active ? `${s.color} text-white shadow-lg ${s.ring} ring-4 ring-offset-slate-900 ring-offset-2 rotate-6`
                        : done  ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-500"}`}>
                      {done ? <Check size={16} /> : s.n}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{s.t}</p>
                      <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mt-0.5">{s.d}</p>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom status */}
          <div className="p-6">
            <div className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Connecté</p>
              </div>
              <p className="text-[10px] text-slate-500 font-bold">Admin v2.4.0</p>
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-rows-[auto_1fr_auto] overflow-hidden min-w-0">

          {/* Header */}
          <div className="shrink-0">
            {/* Coloured progress bar */}
            <div className="h-1.5 w-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <div className="px-8 pt-6 pb-5 border-b border-slate-100 flex justify-between items-end">
              <div>
                <p className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Administration Scolaire</p>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none italic">
                  {mode === "edit" ? "MODIFICATION" : "INSCRIPTION"}
                </h2>
                <p className="text-indigo-600 font-black uppercase tracking-widest text-sm mt-1">Dossier Élève</p>
              </div>
              <div className="flex items-end gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Étape</span>
                  <div className="text-5xl font-black text-slate-100 italic leading-none">{step}/3</div>
                </div>
                {/* Close X */}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer"
                  className="mb-1 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto custom-scrollbar px-8 py-8 min-h-0 bg-white">
              <form 
                key={`${mode}-${initialData?.id || 'new'}-${open}`}
                ref={formRef} 
                className="space-y-8 pb-8"
              >
                {error && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-8 py-5 rounded-2xl text-sm font-bold animate-shake flex items-center gap-4 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <X size={16} />
                    </div>
                    {error}
                  </div>
                )}

                <div className={step !== 1 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-700"}>
                    <section className="space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500/60 border-b border-indigo-50 pb-2">Informations d'identité</h4>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">N° Admission / Matricule *</Label>
                            <Input name="numAdmission" defaultValue={initialData?.numAdmission} required placeholder="Ex: AD-2024-001" className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-black text-lg text-slate-800" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nom complet de l'élève *</Label>
                            <Input name="nomEtudiant" defaultValue={initialData?.nomEtudiant} required placeholder="Jean Dupont" className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-black text-lg text-slate-800" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 font-arabic">الاسم الكامل بالعربية</Label>
                            <Input name="nomArabe" defaultValue={initialData?.nomArabe} dir="rtl" placeholder="اسم الطالب هنا" className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-arabic text-xl text-slate-800" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Sexe de l'enfant *</Label>
                            <select name="sexe" defaultValue={initialData?.sexe || "Garçon"} required className="w-full h-14 rounded-xl border border-slate-100 bg-slate-50/50 px-6 font-black text-slate-700 outline-none">
                              <option value="Garçon">👦 Garçon</option>
                              <option value="Fille">👧 Fille</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                           <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Date de Naissance</Label>
                              <Input name="dateNaissance" type="date" defaultValue={initialData?.dateNaissance} className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Lieu de Naissance</Label>
                              <Input name="lieuNaissance" defaultValue={initialData?.lieuNaissance} className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Religion</Label>
                              <Input name="religion" defaultValue={initialData?.religion} className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CNIC / Numéro National</Label>
                              <Input name="cnic" defaultValue={initialData?.cnic} placeholder="Numéro d'identification" className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Groupe Sanguin</Label>
                              <select name="groupeSanguin" defaultValue={initialData?.groupeSanguin || ""} className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none">
                                <option value="">-- Choisir --</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                              </select>
                           </div>
                        </div>
                    </section>

                    <section className="p-8 rounded-[2rem] bg-slate-900 shadow-xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Camera size={100} className="text-white" />
                       </div>
                       <div className="relative z-10 flex gap-8 items-center">
                          <div className="h-32 w-32 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl ring-4 ring-slate-800/50">
                            {preview ? (
                              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <User size={48} className="text-slate-600" />
                            )}
                            {isCameraOpen && (
                              <div className="absolute inset-0 z-20 bg-black">
                                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover mirror" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-4">
                             <div>
                                <h4 className="text-white font-black text-lg tracking-tight">Photographie du dossier</h4>
                                <p className="text-slate-500 text-[10px] font-bold mt-0.5 uppercase tracking-widest">Requis pour la carte scolaire</p>
                             </div>
                             <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] gap-2 border border-white/10">
                                  <Upload size={14} className="text-indigo-400" /> UPLOAD
                                </Button>
                                {!isCameraOpen ? (
                                  <Button type="button" variant="ghost" onClick={startCamera} className="flex-1 rounded-xl h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] gap-2 border border-white/10">
                                    <Camera size={14} className="text-indigo-400" /> CAMÉRA
                                  </Button>
                                ) : (
                                  <Button type="button" onClick={capturePhoto} className="flex-1 rounded-xl h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] gap-2">
                                    <Check size={14} /> CAPTURER
                                  </Button>
                                )}
                             </div>
                             {cameraError && (
                               <p className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                 ⚠️ {cameraError}
                               </p>
                             )}
                             <Button type="button" className="w-full rounded-xl h-12 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-black text-[10px] gap-2 border border-indigo-500/20 shadow-inner">
                                <Zap size={14} className="text-amber-400 animate-pulse" /> SMART AI SCAN
                             </Button>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-8">
                       <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500/60 border-b border-indigo-50 pb-2">Détails académiques</h4>
                       
                       <div className="grid grid-cols-3 gap-6">

                          {/* SESSION — loaded from school_sessions table */}
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Session *</Label>
                            <select
                              name="session"
                              defaultValue={initialData?.session || ""}
                              className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none transition-all"
                            >
                              <option value="" disabled>-- Choisir la session --</option>
                              {sessionsList.length > 0
                                ? sessionsList.map(s => (
                                    <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
                                  ))
                                : /* fallback while loading */ [
                                    <option key="f1" value="2024-2025">2024-2025</option>,
                                    <option key="f2" value="2023-2024">2023-2024</option>,
                                  ]
                              }
                            </select>
                          </div>

                          {/* NIVEAU — ALL levels from Paramètres → Académique */}
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Niveau *</Label>
                            <select
                              name="educationalLevel"
                              value={selectedLevel}
                              onChange={e => setSelectedLevel(e.target.value)}
                              required
                              className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none transition-all"
                            >
                              <option value="" disabled>-- Choisir le niveau --</option>
                              {levelsList.map(l => (
                                <option key={l.id} value={l.levelName}>{l.levelName}</option>
                              ))}
                            </select>
                            {levelsList.length === 0 && (
                              <p className="text-[10px] text-amber-500 font-semibold ml-1">⏳ Chargement depuis Paramètres...</p>
                            )}
                          </div>

                          {/* CLASSE — filtered by selected level */}
                          <div className="space-y-3">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Classe *</Label>
                             <select
                               name="classe"
                               value={selectedClasse}
                               onChange={e => setSelectedClasse(e.target.value)}
                               required
                               className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none transition-all"
                             >
                               <option value="" disabled>-- Choisir une classe --</option>
                               {classesList.map(c => (
                                 <option key={c.id} value={c.className}>{c.className}</option>
                               ))}
                             </select>
                          </div>

                        </div>

                       <div className="grid grid-cols-3 gap-6">

                           {/* SECTION — filtered by selected level */}
                           <div className="space-y-3">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Section</Label>
                             <select
                               name="section"
                               value={selectedSection}
                               onChange={e => setSelectedSection(e.target.value)}
                               className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none transition-all"
                             >
                               <option value="">-- Aucune section --</option>
                               {sectionsList.map(s => (
                                 <option key={s.id} value={s.sectionName}>{s.sectionName}</option>
                               ))}
                             </select>
                           </div>

                           {/* CATÉGORIE — static values */}
                           <div className="space-y-3">
                             <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Catégorie</Label>
                             <select name="categorie" defaultValue={initialData?.categorie || "Général"} className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none transition-all">
                                 <option value="Général">Général</option>
                                 <option value="Boursier">Boursier</option>
                                 <option value="Fils d'employé">Fils d'employé</option>
                             </select>
                           </div>

                        </div>

                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Behavior Score (Conduite) /20</Label>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Automated Ranking</span>
                          </div>
                          <Input name="behaviorScore" type="number" step="0.5" defaultValue={initialData?.behaviorScore} className="h-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold" />
                       </div>
                    </section>
                </div>

                <div className={step !== 2 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-700"}>
                    <section className="space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500/60 border-b border-indigo-50 pb-2">Informations du Père / Tuteur</h4>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nom du tuteur légal *</Label>
                            <Input name="nomPere" defaultValue={initialData?.nomPere} required placeholder="Nom et Prénom" className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-black text-lg" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mobile (SMS) *</Label>
                            <Input name="mobile" type="tel" defaultValue={initialData?.mobile} required placeholder="+221 ..." className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-black text-lg" />
                          </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-3 gap-6">
                       <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CNIC / ID</Label>
                        <Input name="cnicPere" defaultValue={initialData?.cnicPere} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</Label>
                        <Input name="whatsapp" defaultValue={initialData?.whatsapp} placeholder="Si différent" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" />
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/30 flex items-start gap-4">
                       <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                          <Zap size={18} className="text-white" />
                       </div>
                       <div>
                          <h4 className="text-indigo-900 font-black tracking-tight text-base italic">Notification Automatique</h4>
                          <p className="text-indigo-600/70 text-xs font-medium mt-0.5">Le نظام enverra un message de bienvenue dès validation.</p>
                       </div>
                    </div>
                  </div>

                <div className={step !== 3 ? "hidden" : "space-y-8 animate-in fade-in slide-in-from-right-8 duration-700"}>
                    <section className="space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 border-b border-emerald-50 pb-2">Planification des Frais</h4>
                       
                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Scolarité Mensuelle</Label>
                            <div className="relative group">
                              <Input name="fraisMensuels" type="number" defaultValue={initialData?.fraisMensuels} className="h-16 pl-20 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-3xl text-emerald-600" />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg bg-emerald-100 flex items-center justify-center">
                                 <span className="font-black text-[10px] text-emerald-700">FCFA</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Droits d'inscription</Label>
                            <div className="relative group">
                              <Input name="fraisInscription" type="number" defaultValue={initialData?.fraisInscription} className="h-16 pl-20 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-3xl text-indigo-600" />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg bg-indigo-100 flex items-center justify-center">
                                 <span className="font-black text-[10px] text-indigo-700">FCFA</span>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">COGES & Carte ID</Label>
                            <div className="relative group">
                              <Input name="fraisCogesCard" type="number" defaultValue={initialData?.fraisCogesCard} className="h-16 pl-20 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-3xl text-amber-600" />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg bg-amber-100 flex items-center justify-center">
                                 <span className="font-black text-[10px] text-amber-700">FCFA</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Transport & Internat</Label>
                            <div className="relative group">
                              <Input name="fraisTransportInternat" type="number" defaultValue={initialData?.fraisTransportInternat} className="h-16 pl-20 rounded-2xl border-slate-100 bg-slate-50/50 font-black text-3xl text-blue-600" />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg bg-blue-100 flex items-center justify-center">
                                 <span className="font-black text-[10px] text-blue-700">FCFA</span>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ancien Solde</Label>
                            <Input name="ancienSolde" type="number" defaultValue={initialData?.ancienSolde} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-xl" />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Statut Initial</Label>
                            <select name="statut" defaultValue={initialData?.statut || "Actif"} className="w-full h-14 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 outline-none">
                              <option value="Actif">Actif</option>
                              <option value="Inactif">Inactif</option>
                              <option value="Diplômé">Diplômé</option>
                              <option value="Exclu">Exclu</option>
                            </select>
                          </div>
                       </div>
                    </section>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl mt-4">
                       <div className="absolute -bottom-10 -right-10 opacity-5 rotate-12">
                         <Zap size={180} className="text-indigo-500" />
                       </div>
                       <div className="relative z-10 space-y-6">
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-1">Finalisation Administrative</p>
                                <h3 className="text-2xl font-black tracking-tight italic">Prêt pour l'admission ?</h3>
                             </div>
                             <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                <Check size={24} className="text-indigo-400" />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Statut Initial</p>
                                <p className="font-black text-emerald-400 text-base mt-1 tracking-tight">✅ DOSSIER ACTIF</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Génération</p>
                                <p className="font-black text-indigo-300 text-base mt-1 tracking-tight">⚙️ AUTO-ALGO</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
              </form>
            </div>

          {/* Footer */}
          <div className="shrink-0 px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              {step > 1 && (
                <Button
                  onClick={prevStep}
                  type="button"
                  variant="ghost"
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white border border-transparent hover:border-slate-200 flex items-center gap-2"
                >
                  <ChevronLeft size={14} /> Précédent
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600"
              >
                Quitter
              </Button>
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-11 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all hover:scale-105 active:scale-95 group flex items-center gap-2"
                >
                  Suivant <Zap size={12} className="text-amber-400 group-hover:rotate-12 transition-transform" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="h-11 px-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                  {loading ? "TRAITEMENT..." : mode === "edit" ? "METTRE À JOUR" : "VALIDER L'INSCRIPTION"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  ) : null;

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all font-bold gap-2 flex items-center justify-center group">
            <Zap size={18} className="text-amber-400 group-hover:scale-125 transition-transform" />
            Ajouter un étudiant
          </button>
        )}
      </div>
      {typeof window !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
