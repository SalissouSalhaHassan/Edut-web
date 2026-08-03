"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createLibraryBook, updateLibraryBook } from "@/domains/library/actions/library.actions";
import { LibraryBookFormData } from "../validators/library.schema";

interface BookDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function BookDialog({ mode = "add", initialData, trigger }: BookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const isDig = form.get("isDigital") === "true";
    const data: LibraryBookFormData = {
      title: form.get("title") as string,
      author: form.get("author") as string,
      isbn: form.get("isbn") as string,
      category: form.get("category") as string,
      totalQuantity: isDig ? 9999 : (Number(form.get("totalQuantity")) || 1),
      shelfLocation: form.get("shelfLocation") as string,
      fileUrl: form.get("fileUrl") as string,
      fileType: form.get("fileType") as string || "PDF",
      isDigital: isDig ? "true" : "false",
      description: form.get("description") as string,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateLibraryBook(initialData.id, data);
    } else {
      result = await createLibraryBook(data);
    }

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  const [isDigitalState, setIsDigitalState] = useState(initialData?.isDigital === "true");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (

        <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all font-bold gap-2 flex items-center justify-center">
          Ajouter une Ressource / Livre
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === "edit" ? "Modifier la Ressource" : "Nouvelle Ressource Documentaire"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Format Selection: Physical vs Digital */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Format de la ressource</p>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Choisissez si la ressource est un e-book/document numérique ou physique</p>
              </div>
              <select
                name="isDigital"
                value={isDigitalState ? "true" : "false"}
                onChange={(e) => setIsDigitalState(e.target.value === "true")}
                className="h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
              >
                <option value="false">📖 Livre Physique</option>
                <option value="true">💻 Numérique (E-Book / PDF / Lien)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Titre de la ressource / Livre *</Label>
              <Input name="title" defaultValue={initialData?.title} required className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Auteur / Source</Label>
                <Input name="author" defaultValue={initialData?.author} className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">ISBN / Code de référence</Label>
                <Input name="isbn" defaultValue={initialData?.isbn} className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Catégorie</Label>
                <select name="category" defaultValue={initialData?.category || "Sciences"} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="Sciences">Sciences</option>
                  <option value="Littérature">Littérature</option>
                  <option value="Histoire">Histoire</option>
                  <option value="Mathématiques">Mathématiques</option>
                  <option value="Informatique">Informatique</option>
                  <option value="Langues">Langues</option>
                  <option value="Dictionnaires">Dictionnaires</option>
                  <option value="Manuels Scolaires">Manuels Scolaires</option>
                  <option value="Recherche & Thèses">Recherche & Thèses</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Rayon / Emplacement</Label>
                <Input name="shelfLocation" defaultValue={initialData?.shelfLocation} placeholder={isDigitalState ? "ex: Serveur / Cloud" : "ex: A1"} className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
              </div>
            </div>

            {/* Digital specific fields */}
            {isDigitalState && (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-4">
                <p className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400">Détails de la ressource numérique</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Lien / URL du Fichier PDF ou Document</Label>
                    <Input name="fileUrl" defaultValue={initialData?.fileUrl} placeholder="https://... ou path/to/document.pdf" className="rounded-xl border-slate-200 dark:border-slate-800 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Type Fichier</Label>
                    <select name="fileType" defaultValue={initialData?.fileType || "PDF"} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 h-10 text-xs font-bold outline-none">
                      <option value="PDF">PDF</option>
                      <option value="EPUB">EPUB / E-Book</option>
                      <option value="LINK">Lien Web</option>
                      <option value="AUDIO">Audio</option>
                      <option value="VIDEO">Vidéo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Résumé / Description</Label>
              <textarea name="description" defaultValue={initialData?.description} rows={2} placeholder="Brève présentation du document..." className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none" />
            </div>

            {!isDigitalState && (
              <div className="space-y-2 w-1/2">
                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Quantité Totale en stock *</Label>
                <Input name="totalQuantity" type="number" defaultValue={initialData?.totalQuantity || 1} required className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-500/20 dark:shadow-none">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
