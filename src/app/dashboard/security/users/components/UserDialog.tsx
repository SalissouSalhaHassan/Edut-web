"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal, DialogOverlay 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Lock, Mail, Shield, Globe, Pencil, X } from "lucide-react";
import { saveUser } from "@/domains/auth/actions/users.actions";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createPortal } from "react-dom";
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

export default function UserDialog({ 
  user, roles, schools = [], currentUser, onSuccess, trigger, isMenuItem, 
  openOverride, onOpenChangeOverride 
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

  // Reset form when user or open state changes
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

      // Announce instructions when opening
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
    
    // Final data cleanup before sending
    const submissionData = {
      ...formData,
      roleId: formData.roleId === "" ? null : formData.roleId,
      langue: formData.langue || "FR",
      educationalLevel: formData.educationalLevel || "Primaire",
    };

    try {
      console.log("[UserDialog] Submitting form data:", submissionData);
      const res = await saveUser(submissionData, user?.id);
      
      if (res.success) {
        toast.success(user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès");
        setOpen(false);
        onSuccess?.();
      } else {
        console.error("[UserDialog] Save failed:", res.error);
        toast.error(res.error || "Une erreur est survenue lors de l'enregistrement");
      }
    } catch (error: any) {
      console.error("[UserDialog] Exception during submit:", error);
      toast.error(error.message || "Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  const renderTrigger = () => {
    // If we're using external control, we don't need a trigger
    if (openOverride !== undefined) return null;

    if (trigger) {
      return (
        <div onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }} className="inline-block cursor-pointer w-full">
          {trigger}
        </div>
      );
    }

    if (isMenuItem) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
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
        <DialogOverlay className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
        <DialogContent 
          className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-[500px] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 focus:outline-none"
        >
          <DialogHeader className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            {user ? <Pencil size={24} /> : <User size={24} />}
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
            {user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <p className="text-sm text-slate-400 font-medium">
            {user ? "Mettez à jour les informations de compte" : "Créez un nouveau compte d'accès au système"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Identifiant</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <Input 
                  placeholder="ex: jdoe" 
                  value={formData.utilisateur}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev, 
                      utilisateur: val,
                      // Automatically sync Supabase ID if we're creating a new user
                      supabaseId: !user ? val : prev.supabaseId
                    }));
                  }}
                  className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nom Complet</Label>
              <Input 
                placeholder="ex: John Doe" 
                value={formData.nomPrenom}
                onChange={(e) => setFormData({...formData, nomPrenom: e.target.value})}
                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Mot de passe {user && "(Laisser vide pour ne pas changer)"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <Input 
                type="password"
                placeholder="••••••••" 
                value={formData.motDePasse}
                onChange={(e) => setFormData({...formData, motDePasse: e.target.value})}
                className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                required={!user}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Rôle</Label>
              <Select 
                value={formData.roleId} 
                onValueChange={(v) => setFormData({...formData, roleId: v})}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()} className="rounded-xl focus:bg-indigo-50">
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Niveau Éducatif</Label>
              <Select 
                value={formData.educationalLevel} 
                onValueChange={(v) => setFormData({...formData, educationalLevel: v})}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  <SelectItem value="Primaire" className="rounded-xl">Primaire</SelectItem>
                  <SelectItem value="Collège" className="rounded-xl">Collège</SelectItem>
                  <SelectItem value="Lycée" className="rounded-xl">Lycée</SelectItem>
                  <SelectItem value="Université" className="rounded-xl">Université</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Langue</Label>
            <Select 
              value={formData.langue} 
              onValueChange={(v) => setFormData({...formData, langue: v})}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                <SelectItem value="FR" className="rounded-xl">Français</SelectItem>
                <SelectItem value="AR" className="rounded-xl">العربية</SelectItem>
                <SelectItem value="EN" className="rounded-xl">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              ID Supabase (Lien d'authentification)
            </Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <Input 
                placeholder="ID de l'utilisateur dans Supabase" 
                value={formData.supabaseId}
                onChange={(e) => setFormData({...formData, supabaseId: e.target.value})}
                className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50 font-medium text-xs text-slate-500"
              />
            </div>
          </div>

          {currentUser?.superAdmin && schools.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">École (Multi-Tenancy)</Label>
              <Select 
                value={formData.schoolId} 
                onValueChange={(v) => setFormData({...formData, schoolId: v})}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-amber-50/50 border-amber-100 font-bold">
                  <SelectValue placeholder="Attribuer à une école" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {schools.map((school: any) => (
                    <SelectItem key={school.id} value={school.id.toString()} className="rounded-xl">
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Checkbox 
              id="admin" 
              checked={formData.admin}
              onCheckedChange={(checked) => setFormData({...formData, admin: !!checked})}
              className="rounded-md border-slate-300 data-[state=checked]:bg-indigo-600"
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="admin" className="text-sm font-black text-slate-700 leading-none cursor-pointer">
                Administrateur Système
              </label>
              <p className="text-[11px] text-slate-400 font-medium">
                Accès complet à tous les paramètres de configuration.
              </p>
            </div>
          </div>

          {currentUser?.superAdmin && (
            <div className="flex items-center space-x-2 bg-rose-50 p-4 rounded-2xl border border-rose-100/50">
              <Checkbox 
                id="superAdmin" 
                checked={formData.superAdmin}
                onCheckedChange={(checked) => setFormData({...formData, superAdmin: !!checked})}
                className="rounded-md border-rose-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="superAdmin" className="text-sm font-black text-rose-800 leading-none cursor-pointer">
                  Super Administrateur
                </label>
                <p className="text-[11px] text-rose-500 font-medium">
                  Accès global à l'administration de toute la plateforme.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
            >
              {loading ? "Traitement..." : user ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
