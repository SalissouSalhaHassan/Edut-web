"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { createEmployee, updateEmployee } from "@/domains/hr/actions/employees.actions";
import { EmployeeFormData } from "../validators/employee.schema";
import { Edit } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { useEffect } from "react";

interface EmployeeDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function EmployeeDialog({ mode = "add", initialData, trigger }: EmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { speak } = useSpeech();

  useEffect(() => {
    if (open) {
      if (mode === "add") {
        speak("Nouvel employé. Veuillez remplir le formulaire d'identité et de contact pour enregistrer le nouveau membre du personnel.", "fr-FR");
      } else {
        speak("Modification de l'employé. Vous pouvez mettre à jour les informations professionnelles ou personnelles.", "fr-FR");
      }
    }
  }, [open, mode, speak]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: EmployeeFormData = {
      empId: form.get("empId") as string,
      nom: form.get("nom") as string,
      poste: form.get("poste") as string,
      departement: form.get("departement") as string,
      mobile: form.get("mobile") as string,
      email: form.get("email") as string,
      dateEmbauche: form.get("dateEmbauche") as string,
      salaireBase: Number(form.get("salaireBase")) || 0,
      sexe: (form.get("sexe") as "Homme" | "Femme") || undefined,
      dateNaissance: form.get("dateNaissance") as string,
      cnic: form.get("cnic") as string,
      adresse: form.get("adresse") as string,
      banqueNom: form.get("banqueNom") as string,
      banqueCompte: form.get("banqueCompte") as string,
      statut: (form.get("statut") as string) || "Actif",
      educationalLevel: (form.get("educationalLevel") as string) || undefined,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateEmployee(initialData.id, data);
    } else {
      result = await createEmployee(data);
    }

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all font-bold gap-2 flex items-center justify-center">
            Ajouter un employé
          </button>
        )}
      </div>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
        <DialogContent className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-3xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 focus:outline-none">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
              {mode === "edit" ? "Modifier l'Employé" : "Nouvel Employé"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
                {error}
              </div>
            )}

            {/* ─── Identité ─── */}
            <fieldset className="border border-slate-100 rounded-[2rem] p-8 space-y-6 bg-slate-50/50">
              <legend className="px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] text-primary bg-white border border-slate-100 rounded-full shadow-sm">
                🪪 Identité
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">ID Employé *</Label>
                  <Input name="empId" defaultValue={initialData?.empId} required className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Nom complet *</Label>
                  <Input name="nom" defaultValue={initialData?.nom} required className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Sexe</Label>
                  <select
                    name="sexe"
                    defaultValue={initialData?.sexe || ""}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Date de naissance</Label>
                  <Input type="date" name="dateNaissance" defaultValue={initialData?.dateNaissance} className="rounded-xl h-11 text-slate-700" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Numéro de Carte d'Identité (CNIC)</Label>
                  <Input name="cnic" defaultValue={initialData?.cnic} className="rounded-xl h-11" />
                </div>
              </div>
            </fieldset>

            {/* ─── Contact & Adresse ─── */}
            <fieldset className="border border-slate-100 rounded-[2rem] p-8 space-y-6 bg-slate-50/50">
              <legend className="px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] text-primary bg-white border border-slate-100 rounded-full shadow-sm">
                📞 Contact &amp; Adresse
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Téléphone Mobile</Label>
                  <Input name="mobile" defaultValue={initialData?.mobile} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Adresse E-mail</Label>
                  <Input type="email" name="email" defaultValue={initialData?.email} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Adresse Physique</Label>
                  <Textarea name="adresse" defaultValue={initialData?.adresse} className="rounded-xl" rows={3} />
                </div>
              </div>
            </fieldset>

            {/* ─── Poste & Contrat ─── */}
            <fieldset className="border border-slate-100 rounded-[2rem] p-8 space-y-6 bg-slate-50/50">
              <legend className="px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] text-primary bg-white border border-slate-100 rounded-full shadow-sm">
                💼 Poste &amp; Contrat
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Poste / Fonction</Label>
                  <Input name="poste" defaultValue={initialData?.poste} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Département</Label>
                  <Input name="departement" defaultValue={initialData?.departement} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Date d'embauche</Label>
                  <Input type="date" name="dateEmbauche" defaultValue={initialData?.dateEmbauche} className="rounded-xl h-11 text-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Niveau Éducatif / Secteur</Label>
                  <select
                    name="educationalLevel"
                    defaultValue={initialData?.educationalLevel || "Primaire"}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="Tous">Tous</option>
                    <option value="Maternelle">Maternelle</option>
                    <option value="Primaire">Primaire</option>
                    <option value="Collège">Collège</option>
                    <option value="Lycée">Lycée</option>
                    <option value="Supérieur">Supérieur</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Statut</Label>
                  <select
                    name="statut"
                    defaultValue={initialData?.statut || "Actif"}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                    <option value="En Attente">En Attente</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ─── Finances & Banque ─── */}
            <fieldset className="border border-slate-100 rounded-[2rem] p-8 space-y-6 bg-slate-50/50">
              <legend className="px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] text-primary bg-white border border-slate-100 rounded-full shadow-sm">
                💰 Finances &amp; Banque
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Salaire de Base</Label>
                  <Input type="number" name="salaireBase" defaultValue={initialData?.salaireBase} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Nom de la Banque</Label>
                  <Input name="banqueNom" defaultValue={initialData?.banqueNom} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">Numéro de Compte</Label>
                  <Input name="banqueCompte" defaultValue={initialData?.banqueCompte} className="rounded-xl h-11" />
                </div>
              </div>
            </fieldset>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11">
                {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

