"use client";

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Phone,
  User,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Smartphone,
  Users,
  Search,
  Filter,
  FileText,
  BadgeCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
  Layers,
  CheckCheck,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface NotificationRecipient {
  id: string;
  name: string;
  role: "Parent" | "Élève" | "Enseignant" | "Directeur";
  phone: string;
  classe?: string;
  matricule?: string;
  ecole?: string;
  moyenne?: number;
  rang?: string;
}

const DEFAULT_RECIPIENTS: NotificationRecipient[] = [
  {
    id: "REC-01",
    name: "M. Ibrahima Seydou (Parent de Amina)",
    role: "Parent",
    phone: "+227 90 12 34 56",
    classe: "Terminale D",
    matricule: "EDUT-2026-8841",
    ecole: "Lycée Excellence Niamey",
    moyenne: 16.5,
    rang: "1ère",
  },
  {
    id: "REC-02",
    name: "Mme. Fatouma Garba (Parent de Moussa)",
    role: "Parent",
    phone: "+227 96 55 44 33",
    classe: "3ème A",
    matricule: "EDUT-2026-5219",
    ecole: "CEG Lazaret",
    moyenne: 11.2,
    rang: "14ème",
  },
  {
    id: "REC-03",
    name: "Dr. Ousmane Ibrahim (Proviseur)",
    role: "Directeur",
    phone: "+227 92 88 77 66",
    ecole: "Université Privée Aboubacar Ibrahim",
  },
  {
    id: "REC-04",
    name: "M. Abdoulaye Mamane (Professeur Mathématiques)",
    role: "Enseignant",
    phone: "+227 91 22 33 44",
    ecole: "Lycée Dan Baskoré Maradi",
    classe: "1ère C",
  },
  {
    id: "REC-05",
    name: "M. Salifou Amadou (Parent de Hadiza)",
    role: "Parent",
    phone: "+227 94 11 22 88",
    classe: "CM2 B",
    matricule: "EDUT-2026-1042",
    ecole: "École Primaire Bobiel",
    moyenne: 14.8,
    rang: "3ème",
  },
];

interface TemplateOption {
  id: string;
  title: string;
  icon: any;
  category: "bulletin" | "id_card" | "admit_card" | "absence" | "circular";
  color: string;
  templateText: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "bulletin",
    title: "Bulletin & Relevé de Notes",
    icon: FileText,
    category: "bulletin",
    color: "#3b82f6",
    templateText:
      "Bonjour Chers Parents de {nom},\n\nLe bulletin officiel du 1er Trimestre de votre enfant (Classe: {classe}, Établissement: {ecole}) est disponible.\n📊 *Moyenne Générale :* {moyenne}/20 (Rang : {rang})\n\nVous pouvez consulter et télécharger le relevé certifié avec QR Code ici :\nhttps://edut-web.vercel.app/bulletins/{matricule}\n\n_Direction des Études - Edut Pro_",
  },
  {
    id: "id_card",
    title: "Carte d'Identité Scolaire (ID Card)",
    icon: BadgeCheck,
    category: "id_card",
    color: "#10b981",
    templateText:
      "Notification Officielle Edut Pro :\n\nLa carte d'identité scolaire biométrique de l'élève *{nom}* (Matricule : {matricule}, Classe : {classe}) a été émise avec succès.\n\nCe badge numérique officiel est doté d'un QR Code sécurisé pour l'accès aux examens et aux transports scolaires.\nConsultez le badge ici :\nhttps://edut-web.vercel.app/dashboard/id-cards?search={matricule}\n\n_Secrétariat Général de l'Établissement_",
  },
  {
    id: "admit_card",
    title: "Convocation & Carte d'Admission",
    icon: CheckCircle2,
    category: "admit_card",
    color: "#8b5cf6",
    templateText:
      "CONVOCATION OFFICIELLE AUX ÉPREUVES D'EXAMEN\n\nL'élève *{nom}* (Matricule : {matricule}) est convoqué aux épreuves de la session d'examen nationale.\n📍 *Centre d'Examen :* {ecole}\n🚪 *Salle :* Salle N°04 (Table N°18)\n🕒 *Horaires :* Présence requise dès 07h30\n\n⚠️ *Rappel :* La présentation de la carte scolaire Edut Pro est obligatoire.\n\n_Inspection Générale des Examens & Concours_",
  },
  {
    id: "absence",
    title: "Alerte Absence Immédiate",
    icon: AlertTriangle,
    category: "absence",
    color: "#ef4444",
    templateText:
      "⚠️ *ALERTE ÉCOLE - ABSENCE IMMÉDIATE*\n\nChers Parents,\nNous vous informons que votre enfant *{nom}* (Classe : {classe}) a été enregistré *absent* ce jour sans justificatif transmis.\n\nMerci de contacter sans délai la Vie Scolaire au +227 20 00 00 00 pour justifier cette absence ou régulariser le dossier.\n\n_Direction de la Vie Scolaire - {ecole}_",
  },
  {
    id: "circular",
    title: "Circulaire & Instruction d'Inspection",
    icon: Shield,
    category: "circular",
    color: "#06b6d4",
    templateText:
      "RÉPUBLIQUE DU NIGER\nMinistère de l'Éducation Nationale\nInspection de l'Enseignement\n\n*CIRCULAIRE N°2026/04/MEN*\nÀ l'attention de M./Mme la Direction de {ecole} :\n\nDans le cadre de l'audit national des canevas statistiques, vous êtes invités à valider vos effectifs et vos déclarations d'infrastructures avant le 30 juin 2026.\n\nPlateforme de transmission : https://edut-web.vercel.app/dashboard/canevas\n\n_L'Inspecteur Pédagogique Régional_",
  },
];

interface WhatsAppHubProps {
  isDarkMode?: boolean;
}

export default function WhatsAppAutomationHub({ isDarkMode = false }: WhatsAppHubProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("bulletin");
  const [selectedRecipientId, setSelectedRecipientId] = useState("REC-01");
  const [customPhone, setCustomPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [customClass, setCustomClass] = useState("");
  const [customAverage, setCustomAverage] = useState("15.5");
  const [customSchool, setCustomSchool] = useState("Lycée d'Excellence");
  const [searchRecipient, setSearchRecipient] = useState("");

  // History log state
  const [dispatchLogs, setDispatchLogs] = useState<
    { id: string; recipientName: string; phone: string; templateTitle: string; time: string; status: "success" | "pending" }[]
  >([
    {
      id: "LOG-01",
      recipientName: "M. Ibrahima Seydou",
      phone: "+227 90 12 34 56",
      templateTitle: "Bulletin & Relevé de Notes",
      time: "Aujourd'hui à 11:20",
      status: "success",
    },
    {
      id: "LOG-02",
      recipientName: "Mme. Fatouma Garba",
      phone: "+227 96 55 44 33",
      templateTitle: "Alerte Absence Immédiate",
      time: "Hier à 08:45",
      status: "success",
    },
  ]);

  const activeTemplate = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  }, [selectedTemplateId]);

  const activeRecipient = useMemo(() => {
    return DEFAULT_RECIPIENTS.find((r) => r.id === selectedRecipientId);
  }, [selectedRecipientId]);

  // Sync recipient values into form
  React.useEffect(() => {
    if (activeRecipient) {
      setCustomPhone(activeRecipient.phone);
      setCustomName(activeRecipient.name);
      setCustomClass(activeRecipient.classe || "Terminale");
      setCustomSchool(activeRecipient.ecole || "Complexe Scolaire");
      setCustomAverage(String(activeRecipient.moyenne || "15.0"));
    }
  }, [activeRecipient]);

  // Formatted Message Preview
  const formattedMessage = useMemo(() => {
    let text = activeTemplate.templateText;
    text = text.replace(/{nom}/g, customName || "Élève");
    text = text.replace(/{classe}/g, customClass || "Classe");
    text = text.replace(/{ecole}/g, customSchool || "Établissement Scolaire");
    text = text.replace(/{moyenne}/g, customAverage || "15.0");
    text = text.replace(/{rang}/g, activeRecipient?.rang || "2ème");
    text = text.replace(/{matricule}/g, activeRecipient?.matricule || "EDUT-2026-0000");
    return text;
  }, [activeTemplate, customName, customClass, customSchool, customAverage, activeRecipient]);

  // Clean WhatsApp URL
  const cleanPhone = customPhone.replace(/[\s\-\(\)]/g, "");
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(formattedMessage)}`;

  // Send action
  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    // Add to logs
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      recipientName: customName || cleanPhone,
      phone: cleanPhone,
      templateTitle: activeTemplate.title,
      time: "À l'instant",
      status: "success" as const,
    };
    setDispatchLogs((prev) => [newLog, ...prev]);
    toast.success(`Ouverture de WhatsApp pour ${customName || cleanPhone}...`);
    window.open(whatsappUrl, "_blank");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(formattedMessage);
    toast.success("Message WhatsApp copié dans le presse-papiers !");
  };

  return (
    <div className={cn("space-y-6 w-full transition-colors duration-300", isDarkMode ? "dark text-slate-100" : "text-slate-900")}>
      {/* Top Banner */}
      <div className={cn(
        "relative rounded-3xl border p-6 overflow-hidden shadow-xl transition-all",
        isDarkMode
          ? "bg-gradient-to-br from-[#0b1419] via-[#0d1c24] to-[#071116] border-emerald-950/60"
          : "bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white border-emerald-800"
      )}>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30">
              <MessageSquare className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  Hub d'Automatisation WhatsApp & SMS
                  <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Direct Send
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                Diffusion instantanée en 1-clic des bulletins de notes, cartes d'identité scolaire, convocations et alertes d'absence aux parents et enseignants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950/50 border border-emerald-500/30 px-4 py-2 text-center backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Envois Effectués</span>
              <span className="text-xl font-black text-white">{dispatchLogs.length + 128}</span>
            </div>
            <div className="rounded-2xl bg-slate-950/50 border border-emerald-500/30 px-4 py-2 text-center backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Taux Délivrabilité</span>
              <span className="text-xl font-black text-emerald-400">99.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Interactive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template & Recipient Selection (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Template Chooser */}
          <div className={cn(
            "rounded-3xl border p-5 space-y-3 shadow-md",
            isDarkMode ? "bg-[#111624] border-slate-800" : "bg-white border-slate-200"
          )}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers size={14} className="text-emerald-500" />
              1. Choisir le Modèle de Message
            </h3>

            <div className="space-y-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all",
                      isSelected
                        ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                        : isDarkMode
                        ? "border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300"
                        : "border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${tmpl.color}20`, color: tmpl.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black block truncate text-slate-900 dark:text-white">
                        {tmpl.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Modèle dynamique officiel
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Recipient Quick Picker */}
          <div className={cn(
            "rounded-3xl border p-5 space-y-3 shadow-md",
            isDarkMode ? "bg-[#111624] border-slate-800" : "bg-white border-slate-200"
          )}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users size={14} className="text-emerald-500" />
              2. Destinataire Cible
            </h3>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {DEFAULT_RECIPIENTS.map((rec) => {
                const isSelected = rec.id === selectedRecipientId;
                return (
                  <button
                    key={rec.id}
                    onClick={() => setSelectedRecipientId(rec.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 font-bold"
                        : isDarkMode
                        ? "border-slate-800/60 bg-slate-900/30 text-slate-300 hover:bg-slate-800/40"
                        : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate font-bold text-slate-900 dark:text-white">{rec.name}</span>
                      <span className="text-[10px] text-slate-400">{rec.phone} • {rec.role}</span>
                    </div>
                    {isSelected && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Parameters & Live Editor (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className={cn(
            "rounded-3xl border p-5 space-y-4 shadow-md",
            isDarkMode ? "bg-[#111624] border-slate-800" : "bg-white border-slate-200"
          )}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-500" />
              3. Données & Personnalisation du Message
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Numéro WhatsApp (avec indicatif) :
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+227 90 00 00 00"
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition",
                    isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                  )}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Nom Complet de l'Élève / Destinataire :
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition",
                    isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Classe :
                  </label>
                  <input
                    type="text"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                    )}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Moyenne :
                  </label>
                  <input
                    type="text"
                    value={customAverage}
                    onChange={(e) => setCustomAverage(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Nom de l'Établissement :
                </label>
                <input
                  type="text"
                  value={customSchool}
                  onChange={(e) => setCustomSchool(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border text-xs font-bold outline-none transition",
                    isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-500"
                  )}
                />
              </div>
            </div>

            {/* Quick Trigger Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleSendWhatsApp}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Send size={16} />
                <span>Envoyer via WhatsApp</span>
              </button>

              <button
                onClick={handleCopyText}
                className={cn(
                  "w-full flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition",
                  isDarkMode
                    ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <Copy size={14} />
                <span>Copier le texte complet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Smartphone Preview (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-full max-w-[340px] rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-950 p-3 shadow-2xl relative">
            {/* Phone Speaker & Camera Notch */}
            <div className="mx-auto h-4 w-28 rounded-full bg-slate-800 mb-2 flex items-center justify-center">
              <span className="size-2 rounded-full bg-slate-900" />
            </div>

            {/* WhatsApp App Mockup Screen */}
            <div className="rounded-[1.8rem] bg-[#0b141a] overflow-hidden flex flex-col h-[520px] text-white font-sans text-xs">
              {/* WhatsApp Chat Top Bar */}
              <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2.5 border-b border-slate-800">
                <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  EP
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block truncate text-xs">Edut Pro • Scolaire</span>
                  <span className="text-[10px] text-emerald-400 block">Compte Officiel Vérifié</span>
                </div>
                <BadgeCheck size={16} className="text-emerald-400" />
              </div>

              {/* Chat Message Canvas */}
              <div className="flex-1 p-3 overflow-y-auto bg-[radial-gradient(#182229_1px,transparent_1px)] [background-size:16px_16px] space-y-2">
                <div className="text-center my-1">
                  <span className="rounded-md bg-[#182229] px-2 py-0.5 text-[9px] text-slate-400 uppercase tracking-wider">
                    Aujourd'hui
                  </span>
                </div>

                {/* Received Bubble (WhatsApp Green Tone) */}
                <div className="rounded-2xl rounded-tr-none bg-[#005c4b] p-3 text-slate-100 shadow-md whitespace-pre-wrap leading-relaxed text-[11px] relative">
                  {formattedMessage}
                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 mt-1">
                    <span>12:00</span>
                    <CheckCheck size={12} className="text-cyan-300" />
                  </div>
                </div>
              </div>

              {/* Fake WhatsApp Input Bottom Bar */}
              <div className="bg-[#1f2c34] p-2 flex items-center gap-2">
                <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[11px] text-slate-400">
                  Message...
                </div>
                <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                  <Send size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dispatch History Logs */}
      <div className={cn(
        "rounded-3xl border p-5 space-y-3 shadow-md",
        isDarkMode ? "bg-[#111624] border-slate-800" : "bg-white border-slate-200"
      )}>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock size={14} className="text-emerald-500" />
          Historique des Derniers Envois Réussis
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {dispatchLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CheckCheck size={16} />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{log.recipientName}</span>
                  <span className="text-[10px] text-slate-400">{log.phone} • {log.templateTitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{log.time}</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase">
                  Délivré
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
