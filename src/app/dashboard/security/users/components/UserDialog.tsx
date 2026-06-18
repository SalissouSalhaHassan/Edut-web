"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Lock,
  Shield,
  Globe,
  Pencil,
  X,
  BookOpen,
  Building2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Languages,
  GraduationCap,
  Users,
} from "lucide-react";
import { saveUser } from "@/domains/auth/actions/users.actions";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/use-speech";

interface UserDialogProps {
  user?: any;
  roles: any[];
  schools?: any[];
  currentUser?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  isMenuItem?: boolean;
  openOverride?: boolean;
  onOpenChangeOverride?: (open: boolean) => void;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "FR", label: "Français", flag: "🇫🇷" },
  { value: "AR", label: "العربية", flag: "🇩🇿" },
  { value: "EN", label: "English", flag: "🇬🇧" },
];

const EDUCATION_LEVELS = [
  { value: "Primaire", label: "Primaire", icon: "📚" },
  { value: "Collège", label: "Collège", icon: "📖" },
  { value: "Lycée", label: "Lycée", icon: "🎓" },
  { value: "Université", label: "Université", icon: "🏛️" },
];

// ─── Reusable chip-checkbox ───────────────────────────────────────────────────
function ChipOption({
  selected,
  onClick,
  children,
  color = "indigo",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    indigo: {
      bg: selected ? "bg-indigo-600" : "bg-white",
      border: selected ? "border-indigo-600" : "border-slate-200",
      text: selected ? "text-white" : "text-slate-600",
      ring: "ring-indigo-300",
    },
    violet: {
      bg: selected ? "bg-violet-600" : "bg-white",
      border: selected ? "border-violet-600" : "border-slate-200",
      text: selected ? "text-white" : "text-slate-600",
      ring: "ring-violet-300",
    },
    emerald: {
      bg: selected ? "bg-emerald-600" : "bg-white",
      border: selected ? "border-emerald-600" : "border-slate-200",
      text: selected ? "text-white" : "text-slate-600",
      ring: "ring-emerald-300",
    },
    amber: {
      bg: selected ? "bg-amber-500" : "bg-white",
      border: selected ? "border-amber-500" : "border-slate-200",
      text: selected ? "text-white" : "text-slate-600",
      ring: "ring-amber-300",
    },
  };
  const c = colorMap[color] || colorMap.indigo;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold
        transition-all duration-150 cursor-pointer select-none
        ${c.bg} ${c.border} ${c.text}
        hover:shadow-md focus:outline-none focus:ring-2 ${c.ring} focus:ring-offset-1
        ${selected ? "shadow-sm" : "hover:border-slate-300"}
      `}
    >
      {selected && <CheckCircle2 size={12} className="shrink-0" />}
      {children}
    </button>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserDialog({
  user,
  roles,
  schools = [],
  currentUser,
  onSuccess,
  trigger,
  isMenuItem,
  openOverride,
  onOpenChangeOverride,
}: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openOverride !== undefined ? openOverride : internalOpen;
  const setOpen = onOpenChangeOverride || setInternalOpen;

  const { speak } = useSpeech();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    utilisateur: "",
    nomPrenom: "",
    motDePasse: "",
    admin: false,
    superAdmin: false,
    roleId: "",
    langue: "FR",
    educationalLevel: "Primaire",
    supabaseId: "",
    schoolId: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        utilisateur: user?.utilisateur || "",
        nomPrenom: user?.nomPrenom || "",
        motDePasse: "",
        admin: user?.admin || false,
        superAdmin: user?.superAdmin || false,
        roleId: user?.roleId?.toString() || "",
        langue: user?.langue || "FR",
        educationalLevel: user?.educationalLevel || "Primaire",
        supabaseId: user?.supabaseId || "",
        schoolId: user?.schoolId?.toString() || "",
      });
      if (user) {
        speak("Modification de l'utilisateur. Veuillez mettre à jour les informations du compte.", "fr-FR");
      } else {
        speak("Ajout d'un nouvel utilisateur. Veuillez remplir les informations requises pour créer le compte.", "fr-FR");
      }
    }
  }, [user, open, speak]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const submissionData = {
      ...formData,
      roleId: formData.roleId === "" ? null : formData.roleId,
      langue: formData.langue || "FR",
      educationalLevel: formData.educationalLevel || "Primaire",
    };
    try {
      const res = await saveUser(submissionData, user?.id);
      if (res.success) {
        toast.success(user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Une erreur est survenue lors de l'enregistrement");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  const requiredMissing =
    !formData.utilisateur.trim() || !formData.nomPrenom.trim() || (!user && !formData.motDePasse.trim());

  const renderTrigger = () => {
    if (openOverride !== undefined) return null;
    if (trigger) {
      return (
        <div onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="inline-block cursor-pointer w-full">
          {trigger}
        </div>
      );
    }
    if (isMenuItem) {
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="flex w-full items-center gap-2 p-3 rounded-xl cursor-pointer text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm font-semibold outline-none border-none bg-transparent text-left"
        >
          <Pencil size={16} />
          <span>Modifier</span>
        </button>
      );
    }
    return (
      <Button
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
      >
        <User size={18} />
        Ajouter un utilisateur
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger()}
      <DialogPortal>
        {/* Overlay — click to close */}
        <DialogOverlay
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        />

        {/* Panel — stopPropagation so clicks inside don't bubble to overlay */}
        <div
          className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-[1100px] px-4 animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <div className="relative shrink-0">
              {/* Colour bar */}
              <div className="h-1.5 w-full rounded-t-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${user ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-indigo-500 to-blue-600"}`}>
                    {user ? <Pencil size={22} /> : <User size={22} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {user ? "Mettez à jour les informations de compte" : "Créez un nouveau compte d'accès au système"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Scrollable Body ────────────────────────────────────────── */}
            <form id="user-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-7">

              {/* ── Section: Identité ─────────────────────────────────── */}
              <div>
                <SectionHeader
                  icon={<User size={14} />}
                  label="Identité"
                  iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Identifiant */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Identifiant <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={15} />
                      <Input
                        placeholder="ex: jdoe"
                        value={formData.utilisateur}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            utilisateur: val,
                            supabaseId: !user ? val : prev.supabaseId,
                          }));
                        }}
                        className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm focus:border-indigo-400 focus:ring-indigo-100"
                        required
                      />
                    </div>
                  </div>

                  {/* Nom Complet */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Nom Complet <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="ex: John Doe"
                      value={formData.nomPrenom}
                      onChange={(e) => setFormData({ ...formData, nomPrenom: e.target.value })}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm focus:border-indigo-400 focus:ring-indigo-100"
                      required
                    />
                  </div>

                  {/* Mot de passe */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Mot de passe{" "}
                      {user ? (
                        <span className="text-slate-400 normal-case font-medium">(vide = inchangé)</span>
                      ) : (
                        <span className="text-rose-500">*</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={15} />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={formData.motDePasse}
                        onChange={(e) => setFormData({ ...formData, motDePasse: e.target.value })}
                        className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm focus:border-violet-400 focus:ring-violet-100"
                        required={!user}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section: Rôle ─────────────────────────────────────── */}
              {roles.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Users size={14} />}
                    label="Rôle"
                    iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                  />
                  <div className="flex flex-wrap gap-2">
                    {/* No role option */}
                    <ChipOption
                      selected={formData.roleId === ""}
                      onClick={() => setFormData({ ...formData, roleId: "" })}
                      color="indigo"
                    >
                      <span>— Aucun rôle —</span>
                    </ChipOption>
                    {roles.map((role) => (
                      <ChipOption
                        key={role.id}
                        selected={formData.roleId === role.id.toString()}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            roleId: formData.roleId === role.id.toString() ? "" : role.id.toString(),
                          })
                        }
                        color="violet"
                      >
                        <Shield size={11} />
                        {role.roleName}
                      </ChipOption>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section: Niveau Éducatif ───────────────────────────── */}
              <div>
                <SectionHeader
                  icon={<GraduationCap size={14} />}
                  label="Niveau Éducatif"
                  iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((lvl) => (
                    <ChipOption
                      key={lvl.value}
                      selected={formData.educationalLevel === lvl.value}
                      onClick={() => setFormData({ ...formData, educationalLevel: lvl.value })}
                      color="emerald"
                    >
                      <span>{lvl.icon}</span>
                      {lvl.label}
                    </ChipOption>
                  ))}
                </div>
              </div>

              {/* ── Section: Langue ────────────────────────────────────── */}
              <div>
                <SectionHeader
                  icon={<Languages size={14} />}
                  label="Langue d'interface"
                  iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <ChipOption
                      key={lang.value}
                      selected={formData.langue === lang.value}
                      onClick={() => setFormData({ ...formData, langue: lang.value })}
                      color="amber"
                    >
                      <span>{lang.flag}</span>
                      {lang.label}
                    </ChipOption>
                  ))}
                </div>
              </div>

              {/* ── Section: École (Multi-Tenancy) ─────────────────────── */}
              {currentUser?.superAdmin && schools.length > 0 && (
                <div>
                  <SectionHeader
                    icon={<Building2 size={14} />}
                    label="École (Multi-Tenancy)"
                    iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
                  />
                  <div className="flex flex-wrap gap-2">
                    <ChipOption
                      selected={formData.schoolId === ""}
                      onClick={() => setFormData({ ...formData, schoolId: "" })}
                      color="indigo"
                    >
                      — Toutes les écoles —
                    </ChipOption>
                    {schools.map((school: any) => (
                      <ChipOption
                        key={school.id}
                        selected={formData.schoolId === school.id.toString()}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            schoolId:
                              formData.schoolId === school.id.toString() ? "" : school.id.toString(),
                          })
                        }
                        color="amber"
                      >
                        <Building2 size={11} />
                        {school.name}
                      </ChipOption>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section: Sécurité / Accès ──────────────────────────── */}
              <div>
                <SectionHeader
                  icon={<Shield size={14} />}
                  label="Sécurité / Accès"
                  iconBg="bg-gradient-to-br from-slate-600 to-slate-800"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Supabase ID */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      ID Supabase
                    </Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        placeholder="ID de l'utilisateur dans Supabase"
                        value={formData.supabaseId}
                        onChange={(e) => setFormData({ ...formData, supabaseId: e.target.value })}
                        className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 font-medium text-xs text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    {/* Admin checkbox */}
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                      <Checkbox
                        id="admin"
                        checked={formData.admin}
                        onCheckedChange={(checked) => setFormData({ ...formData, admin: !!checked })}
                        className="mt-0.5 rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <div>
                        <div className="text-sm font-black text-slate-700 leading-none group-hover:text-indigo-700">
                          Administrateur Système
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          Accès complet à tous les paramètres.
                        </p>
                      </div>
                    </label>

                    {/* Super Admin */}
                    {currentUser?.superAdmin && (
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-100 bg-rose-50/60 cursor-pointer hover:bg-rose-100 hover:border-rose-200 transition-colors group">
                        <Checkbox
                          id="superAdmin"
                          checked={formData.superAdmin}
                          onCheckedChange={(checked) => setFormData({ ...formData, superAdmin: !!checked })}
                          className="mt-0.5 rounded-md border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                        />
                        <div>
                          <div className="text-sm font-black text-rose-800 leading-none flex items-center gap-1.5">
                            <Crown size={12} className="text-rose-500" />
                            Super Administrateur
                          </div>
                          <p className="text-[10px] text-rose-400 font-medium mt-1">
                            Accès global à toute la plateforme.
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* ── Sticky Footer ──────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-8 py-4 flex items-center justify-between gap-4 rounded-b-3xl">
              {/* Required fields notice */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                {requiredMissing ? (
                  <>
                    <AlertCircle size={14} className="text-amber-400 shrink-0" />
                    <span>
                      Champs obligatoires manquants :{" "}
                      <span className="text-rose-500 font-bold">
                        {[
                          !formData.utilisateur.trim() && "Identifiant",
                          !formData.nomPrenom.trim() && "Nom complet",
                          !user && !formData.motDePasse.trim() && "Mot de passe",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span className="text-emerald-600 font-semibold">Tous les champs requis sont remplis</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="rounded-xl font-bold px-6 text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  form="user-form"
                  disabled={loading || requiredMissing}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold px-8 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Traitement...
                    </span>
                  ) : user ? (
                    "Enregistrer"
                  ) : (
                    "Créer l'utilisateur"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
