"use client";

import React, { useState, useTransition, useRef } from "react";
import { 
  MapPin, Plus, Save, Trash2, Building2, Calendar, 
  Hash, Mail, Phone, Globe, Clock, AtSign, 
  ShieldCheck, Server, Key, Image as ImageIcon,
  CheckCircle2, ExternalLink, Eye, Send, Edit2, Pencil,
  ChevronRight, LayoutGrid, GraduationCap, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { saveBranch, deleteBranch } from "@/domains/settings/actions/settings.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const LEVEL_OPTIONS = [
  { value: "Primaire", label: "Primaire", icon: "📚", desc: "Cursus élémentaire et primaire" },
  { value: "College", label: "Collège", icon: "📖", desc: "Enseignement moyen / premier cycle" },
  { value: "Lycée", label: "Lycée", icon: "🎓", desc: "Second cycle et baccalauréat" },
  { value: "University", label: "Université", icon: "🏛️", desc: "Études supérieures et facultés" },
  { value: "Autre", label: "Autre", icon: "✨", desc: "Formations professionnelles ou spéciales" }
];

const CATEGORY_OPTIONS = [
  { value: "Privé", label: "Privé", icon: "🔒", desc: "Gestion et financement privés" },
  { value: "Public", label: "Public", icon: "🌐", desc: "Établissement étatique public" },
  { value: "Mixte", label: "Mixte", icon: "🔄", desc: "Partenariat mixte public-privé" }
];

interface Branch {
  id?: number;
  branchName: string;
  yearEstablished?: string;
  registrationNo?: string;
  branchAlias?: string;
  instType?: string;
  instCategory?: string;
  email?: string;
  altEmail?: string;
  contactNo?: string;
  officeNo?: string;
  timezone?: string;
  address?: string;
  admPrefix?: string;
  admPadding?: string;
  smtpUrl?: string;
  smtpPort?: string;
  smtpEmail?: string;
  smtpPassword?: string;
  logoPath?: string;
  workingDays?: string;
  ministry?: string;
  region?: string;
  dren?: string;
  department?: string;
  dden?: string;
  inspection?: string;
  commune?: string;
  schoolCode?: string;
}

const DEFAULT_BRANCH_STATE: Branch = {
  branchName: "",
  yearEstablished: "",
  registrationNo: "",
  branchAlias: "",
  instType: "Lycée",
  instCategory: "Privé",
  email: "",
  altEmail: "",
  contactNo: "",
  officeNo: "",
  timezone: "GMT",
  address: "",
  admPrefix: "",
  admPadding: "0001",
  smtpUrl: "",
  smtpPort: "",
  smtpEmail: "",
  smtpPassword: "",
  logoPath: "",
  workingDays: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
  ministry: "",
  region: "",
  dren: "",
  department: "",
  dden: "",
  inspection: "",
  commune: "",
  schoolCode: ""
};

export function CampusSetup({ initialBranches }: { initialBranches: Branch[] }) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Branch>(DEFAULT_BRANCH_STATE);

  // instType helpers
  const instTypeVal = formData.instType || "";
  const selectedTypes = instTypeVal === "Tous" 
    ? LEVEL_OPTIONS.map(o => o.value) 
    : instTypeVal.split(",").map(s => s.trim()).filter(Boolean);
  const hasAllLevels = instTypeVal === "Tous" || selectedTypes.length === LEVEL_OPTIONS.length;

  const toggleInstType = (val: string) => {
    let current = instTypeVal === "Tous" 
      ? LEVEL_OPTIONS.map(o => o.value) 
      : instTypeVal.split(",").map(s => s.trim()).filter(Boolean);
    
    if (current.includes(val)) {
      current = current.filter(item => item !== val);
    } else {
      current = [...current, val];
    }
    
    if (current.length === LEVEL_OPTIONS.length || current.length === 0) {
      handleInputChange("instType", "Tous");
    } else {
      handleInputChange("instType", current.join(","));
    }
  };

  const toggleAllInstTypes = () => {
    if (hasAllLevels) {
      handleInputChange("instType", "");
    } else {
      handleInputChange("instType", "Tous");
    }
  };

  // instCategory helpers
  const instCategoryVal = formData.instCategory || "";
  const selectedCategories = instCategoryVal === "Toutes" 
    ? CATEGORY_OPTIONS.map(o => o.value) 
    : instCategoryVal.split(",").map(s => s.trim()).filter(Boolean);
  const hasAllCategories = instCategoryVal === "Toutes" || selectedCategories.length === CATEGORY_OPTIONS.length;

  const toggleInstCategory = (val: string) => {
    let current = instCategoryVal === "Toutes" 
      ? CATEGORY_OPTIONS.map(o => o.value) 
      : instCategoryVal.split(",").map(s => s.trim()).filter(Boolean);
    
    if (current.includes(val)) {
      current = current.filter(item => item !== val);
    } else {
      current = [...current, val];
    }
    
    if (current.length === CATEGORY_OPTIONS.length || current.length === 0) {
      handleInputChange("instCategory", "Toutes");
    } else {
      handleInputChange("instCategory", current.join(","));
    }
  };

  const toggleAllCategories = () => {
    if (hasAllCategories) {
      handleInputChange("instCategory", "");
    } else {
      handleInputChange("instCategory", "Toutes");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (Max. 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleInputChange("logoPath", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleBranchSelect = (branchId: string | null) => {
    if (!branchId) return;
    if (branchId === "new") {
      setSelectedBranch(null);
      setFormData(DEFAULT_BRANCH_STATE);
    } else {
      const branch = initialBranches.find(b => b.id?.toString() === branchId);
      if (branch) {
        setSelectedBranch(branch);
        // Ensure all fields have at least an empty string to avoid uncontrolled to controlled error
        setFormData({
          ...DEFAULT_BRANCH_STATE,
          ...branch,
          branchName: branch.branchName || "",
          yearEstablished: branch.yearEstablished || "",
          registrationNo: branch.registrationNo || "",
          branchAlias: branch.branchAlias || "",
          instType: branch.instType || "Lycée",
          instCategory: branch.instCategory || "Privé",
          email: branch.email || "",
          altEmail: branch.altEmail || "",
          contactNo: branch.contactNo || "",
          officeNo: branch.officeNo || "",
          timezone: branch.timezone || "GMT",
          address: branch.address || "",
          admPrefix: branch.admPrefix || "",
          admPadding: branch.admPadding || "0001",
          smtpUrl: branch.smtpUrl || "",
          smtpPort: branch.smtpPort || "",
          smtpEmail: branch.smtpEmail || "",
          smtpPassword: branch.smtpPassword || "",
          logoPath: branch.logoPath || "",
          workingDays: branch.workingDays || "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
          ministry: branch.ministry || "",
          region: branch.region || "",
          dren: branch.dren || "",
          department: branch.department || "",
          dden: branch.dden || "",
          inspection: branch.inspection || "",
          commune: branch.commune || "",
          schoolCode: branch.schoolCode || ""
        });
      }
    }
  };

  const handleInputChange = (field: keyof Branch, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: string) => {
    const currentDays = formData.workingDays?.split(",").filter(Boolean) || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    handleInputChange("workingDays", newDays.join(","));
  };

  const onSave = () => {
    console.log("[onSave] Validating branchName:", formData.branchName);
    if (!formData.branchName || formData.branchName.trim() === "") {
      toast.error("Le nom de la branche est requis");
      return;
    }

    startTransition(async () => {
      console.log("[onSave] Sending data:", formData);
      const res = await saveBranch(formData);
      if (res.success) {
        toast.success(selectedBranch ? "Branche mise à jour" : "Nouvelle branche créée");
        if (!selectedBranch) {
           // Reset after create to allow adding another one
           setSelectedBranch(null);
           setFormData(DEFAULT_BRANCH_STATE);
        }
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement");
      }
    });
  };

  const onDelete = (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette branche ?")) return;
    startTransition(async () => {
      const res = await deleteBranch(id);
      if (res.success) {
        toast.success("Branche supprimée");
        setSelectedBranch(null);
        setFormData(DEFAULT_BRANCH_STATE);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* 1. Selectors */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div className="flex-1 max-w-md">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SÉLECTIONNER UNE BRANCHE</label>
            <Select onValueChange={handleBranchSelect} value={selectedBranch?.id?.toString() || "new"}>
              <SelectTrigger className="h-12 rounded-xl border-slate-50 bg-slate-50/50 font-bold">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="font-bold text-indigo-600">+ Ajouter Nouveau</SelectItem>
                {initialBranches.map(b => (
                  <SelectItem key={b.id} value={b.id?.toString() || ""}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {selectedBranch && (
             <>
               <Button 
                 variant="outline"
                 className="h-11 px-6 rounded-xl border-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all"
                 onClick={() => toast.success(`Accès au campus: ${selectedBranch.branchName}`)}
               >
                 <ExternalLink size={16} /> Entrer
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-11 w-11 rounded-xl text-rose-500 hover:bg-rose-50"
                 onClick={() => selectedBranch.id && onDelete(selectedBranch.id)}
               >
                 <Trash2 size={18} />
               </Button>
             </>
           )}
           <Button 
             onClick={onSave}
             disabled={isPending}
             className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
           >
             <Save size={16} /> {isPending ? "ENREGISTREMENT..." : "ENREGISTRER"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Form */}
        <div className="xl:col-span-8 space-y-8">
           {/* Section 1: Basic Info */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <LayoutGrid size={20} />
                 </div>
                 Informations Générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NOM DE LA BRANCHE</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.branchName || ""}
                      onChange={e => handleInputChange("branchName", e.target.value)}
                      placeholder="Campus Central" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ANNÉE D'ÉTABLISSEMENT</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.yearEstablished || ""}
                      onChange={e => handleInputChange("yearEstablished", e.target.value)}
                      placeholder="2024" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">N° ENREGISTREMENT</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.registrationNo || ""}
                      onChange={e => handleInputChange("registrationNo", e.target.value)}
                      placeholder="REG-2024-001"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ALIAS BRANCHE</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.branchAlias || ""}
                      onChange={e => handleInputChange("branchAlias", e.target.value)}
                      placeholder="CC-01" 
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">TYPE INSTITUTION / NIVEAU</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* All Stages Master Card */}
                    <button
                      type="button"
                      onClick={toggleAllInstTypes}
                      className={cn(
                        "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                        hasAllLevels 
                          ? "bg-indigo-50/80 border-indigo-500 shadow-sm shadow-indigo-50" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                          hasAllLevels ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                        )}>
                          ✨
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          hasAllLevels ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 bg-white"
                        )}>
                          {hasAllLevels && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className={cn(
                          "font-black text-xs uppercase tracking-wider transition-colors",
                          hasAllLevels ? "text-indigo-900" : "text-slate-800"
                        )}>Toutes les étapes</p>
                        <p className="text-[10px] font-semibold text-slate-400 leading-snug">Sélectionner tout le cursus</p>
                      </div>
                    </button>

                    {/* Level Option Cards */}
                    {LEVEL_OPTIONS.map(lvl => {
                      const isActive = !hasAllLevels && selectedTypes.includes(lvl.value);
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          onClick={() => toggleInstType(lvl.value)}
                          className={cn(
                            "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                            isActive 
                              ? "bg-emerald-50/80 border-emerald-500 shadow-sm shadow-emerald-50" 
                              : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                              isActive ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                            )}>
                              {lvl.icon}
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white"
                            )}>
                              {isActive && <CheckCircle2 size={12} className="stroke-[3]" />}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className={cn(
                              "font-black text-xs uppercase tracking-wider transition-colors",
                              isActive ? "text-emerald-900" : "text-slate-800"
                            )}>{lvl.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400 leading-snug">{lvl.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">CATÉGORIE</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* All Categories Master Card */}
                    <button
                      type="button"
                      onClick={toggleAllCategories}
                      className={cn(
                        "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                        hasAllCategories 
                          ? "bg-indigo-50/80 border-indigo-500 shadow-sm shadow-indigo-50" 
                          : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                          hasAllCategories ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                        )}>
                          🌟
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          hasAllCategories ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 bg-white"
                        )}>
                          {hasAllCategories && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className={cn(
                          "font-black text-xs uppercase tracking-wider transition-colors",
                          hasAllCategories ? "text-indigo-900" : "text-slate-800"
                        )}>Toutes les catégories</p>
                        <p className="text-[10px] font-semibold text-slate-400 leading-snug">Sélectionner toutes les options</p>
                      </div>
                    </button>

                    {/* Category Option Cards */}
                    {CATEGORY_OPTIONS.map(cat => {
                      const isActive = !hasAllCategories && selectedCategories.includes(cat.value);
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => toggleInstCategory(cat.value)}
                          className={cn(
                            "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-4 group hover:-translate-y-1 hover:shadow-md select-none w-full",
                            isActive 
                              ? "bg-emerald-50/80 border-emerald-500 shadow-sm shadow-emerald-50" 
                              : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300",
                              isActive ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-100" : "bg-white border border-slate-100 text-slate-700 group-hover:scale-105"
                            )}>
                              {cat.icon}
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white"
                            )}>
                              {isActive && <CheckCircle2 size={12} className="stroke-[3]" />}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className={cn(
                              "font-black text-xs uppercase tracking-wider transition-colors",
                              isActive ? "text-emerald-900" : "text-slate-800"
                            )}>{cat.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400 leading-snug">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
           </div>

           {/* Section 2: Contact & Address */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MapPin size={20} />
                 </div>
                 Contact & Adresse
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">EMAIL PRINCIPAL</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.email || ""}
                      onChange={e => handleInputChange("email", e.target.value)}
                      placeholder="contact@campuscentral.com"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">EMAIL ALTERNATIF</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.altEmail || ""}
                      onChange={e => handleInputChange("altEmail", e.target.value)}
                      placeholder="admin@campuscentral.com"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">N° CONTACT</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.contactNo || ""}
                      onChange={e => handleInputChange("contactNo", e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">FUSEAU HORAIRE</Label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10" size={18} />
                    <Select onValueChange={v => handleInputChange("timezone", v)} value={formData.timezone}>
                      <SelectTrigger className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["GMT (UTC+00:00)", "GMT+1", "GMT+2", "UTC"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ADRESSE PHYSIQUE</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-6 text-indigo-500" size={18} />
                    <Textarea 
                      value={formData.address}
                      onChange={e => handleInputChange("address", e.target.value)}
                      rows={3} 
                      placeholder="123 Avenue de la République, Dakar, Sénégal"
                      className="rounded-2xl border-slate-100 bg-slate-50/50 font-bold pl-12 pr-12 pt-5 pb-4" 
                    />
                    <button className="absolute right-4 top-6 text-slate-300 hover:text-indigo-500 transition-colors">
                       <Pencil size={18} />
                    </button>
                  </div>
                </div>
              </div>
           </div>

           {/* Section 2.5: Structure Administrative & Hiérarchie Éducative */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Building2 size={20} />
                 </div>
                 Structure Administrative & Hiérarchie Éducative
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">MINISTÈRE DE TUTELLE</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.ministry || ""}
                      onChange={e => handleInputChange("ministry", e.target.value)}
                      placeholder="Ministère de l'Éducation Nationale"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">RÉGION</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.region || ""}
                      onChange={e => handleInputChange("region", e.target.value)}
                      placeholder="Niamey"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DIRECTION RÉGIONALE (DREN)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.dren || ""}
                      onChange={e => handleInputChange("dren", e.target.value)}
                      placeholder="Direction Régionale de l'Éducation Nationale"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DÉPARTEMENT</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.department || ""}
                      onChange={e => handleInputChange("department", e.target.value)}
                      placeholder="Niamey"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DIRECTION DÉPARTEMENTALE (DDEN)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.dden || ""}
                      onChange={e => handleInputChange("dden", e.target.value)}
                      placeholder="Direction Départementale de l'Éducation"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">INSPECTION</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.inspection || ""}
                      onChange={e => handleInputChange("inspection", e.target.value)}
                      placeholder="Inspection de l'Enseignement Secondaire"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">COMMUNE</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.commune || ""}
                      onChange={e => handleInputChange("commune", e.target.value)}
                      placeholder="Commune de Niamey IV"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CODE ÉTABLISSEMENT</Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <Input 
                      value={formData.schoolCode || ""}
                      onChange={e => handleInputChange("schoolCode", e.target.value)}
                      placeholder="ETB-2026-001"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold" 
                    />
                  </div>
                </div>
              </div>
           </div>

           {/* Section 3: Calendrier de Travail */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Calendar size={20} />
                 </div>
                 Calendrier de Travail
              </h3>
              <div className="flex flex-wrap gap-4">
                 {DAYS.map(day => {
                   const isActive = formData.workingDays?.split(",").includes(day);
                   return (
                     <button
                       key={day}
                       type="button"
                       onClick={() => handleDayToggle(day)}
                       className={cn(
                         "px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm",
                         isActive 
                           ? "bg-indigo-600 text-white border-indigo-600" 
                           : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                       )}
                     >
                       {day}
                     </button>
                   );
                 })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                 <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shadow-sm">
                       <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Heures d'ouverture</p>
                       <p className="text-sm font-bold text-slate-700 mt-0.5">07:30 - 16:30</p>
                    </div>
                 </div>
                 <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shadow-sm">
                       <Calendar size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jours ouvrables</p>
                       <p className="text-sm font-bold text-slate-700 mt-0.5">Lundi - Vendredi</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Side Panels */}
        <div className="xl:col-span-4 space-y-8">
           {/* SMTP Config */}
           <div className="bg-[#1a2333] p-10 rounded-[2.5rem] shadow-2xl space-y-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16" />
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/5 text-indigo-400 flex items-center justify-center">
                    <Mail size={20} />
                 </div>
                 Serveur SMTP (Emails)
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">URL / HÔTE SMTP</Label>
                  <Input 
                    value={formData.smtpUrl || ""}
                    onChange={e => handleInputChange("smtpUrl", e.target.value)}
                    placeholder="smtp.campuscentral.com" 
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">PORT</Label>
                  <Input 
                    value={formData.smtpPort || ""}
                    onChange={e => handleInputChange("smtpPort", e.target.value)}
                    placeholder="587" 
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">EMAIL AUTHENTIFICATION</Label>
                  <Input 
                    value={formData.smtpEmail || ""}
                    onChange={e => handleInputChange("smtpEmail", e.target.value)}
                    placeholder="noreply@campuscentral.com"
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">MOT DE PASSE</Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <Input 
                      type="password"
                      value={formData.smtpPassword || ""}
                      onChange={e => handleInputChange("smtpPassword", e.target.value)}
                      className="h-12 pl-12 pr-12 bg-white/5 border-white/10 rounded-xl text-white font-bold" 
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                       <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connexion sécurisée établie
                 </div>
                 <Button className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">
                    <Send size={14} className="rotate-45" /> Tester la connexion
                 </Button>
              </div>
           </div>

           {/* Branding / Logo */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ImageIcon size={20} />
                 </div>
                 Logo & Branding
              </h3>
              
              <div className="flex flex-col items-center gap-6 py-4">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*" 
                   onChange={handleLogoUpload}
                 />
                 <div 
                   className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 relative overflow-hidden group cursor-pointer"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    {formData.logoPath ? (
                      <img src={formData.logoPath} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={60} />
                    )}
                    <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Pencil size={24} className="text-white" />
                    </div>
                 </div>
                 <div className="text-center">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{formData.branchName || "Campus Central"}</h4>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">Excellence & Réussite</p>
                 </div>
                 
                 <Button 
                   variant="outline" 
                   className="h-12 px-8 rounded-2xl border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    <Upload size={16} /> Changer le logo
                 </Button>
                 <p className="text-[10px] font-bold text-slate-300">PNG, JPG ou SVG (Max. 2MB)</p>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">COULEUR PRINCIPALE</Label>
                 <div className="flex items-center gap-3 flex-wrap">
                    {["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#ef4444"].map((color, i) => (
                      <button 
                        key={color} 
                        className={cn(
                          "w-8 h-8 rounded-full shadow-sm transition-transform active:scale-90",
                          i === 0 && "ring-2 ring-indigo-600 ring-offset-2"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 transition-all">
                       <Plus size={14} />
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">PRÉFIXE ADM</Label>
                  <Input 
                    value={formData.admPrefix || ""}
                    onChange={e => handleInputChange("admPrefix", e.target.value)}
                    placeholder="EDUT" 
                    className="h-12 rounded-xl border-slate-50 bg-slate-50/50 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">PADDING</Label>
                  <Select onValueChange={v => handleInputChange("admPadding", v)} value={formData.admPadding}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-50 bg-slate-50/50 font-bold">
                      <SelectValue placeholder="0001" />
                    </SelectTrigger>
                    <SelectContent>
                      {["001", "0001", "00001"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
