"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveInventoryItem, getInventoryCategories } from "@/domains/inventory/actions/inventory.actions";
import { InventoryItemFormData } from "../validators/inventory.schema";

interface InventoryDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

export default function InventoryDialog({ mode = "add", initialData, trigger }: InventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getInventoryCategories().then(res => {
        if (res.data) setCategories(res.data as any as any[]);
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: InventoryItemFormData = {
      name: form.get("name") as string,
      sku: form.get("sku") as string,
      categoryId: form.get("categoryId") ? Number(form.get("categoryId")) : null,
      quantity: Number(form.get("quantity")) || 0,
      unitPrice: Number(form.get("unitPrice")) || 0,
      condition: form.get("condition") as string,
      location: form.get("location") as string,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await saveInventoryItem(data, initialData.id);
    } else {
      result = await saveInventoryItem(data);
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
          Ajouter au Stock
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "edit" ? "Modifier l'Article" : "Nouvel Article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Nom de l'article *</Label>
              <Input name="name" defaultValue={initialData?.name} required className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">SKU / Code-barres</Label>
                <Input name="sku" defaultValue={initialData?.sku} className="rounded-xl border-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Catégorie</Label>
                <select name="categoryId" defaultValue={initialData?.categoryId} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="">-- Choisir --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Quantité *</Label>
                <Input name="quantity" type="number" defaultValue={initialData?.quantity || 1} required className="rounded-xl border-slate-200 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Prix Unitaire (CFA)</Label>
                <Input name="unitPrice" type="number" defaultValue={initialData?.unitPrice || 0} className="rounded-xl border-slate-200 h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">État</Label>
                <select name="condition" defaultValue={initialData?.condition || "Neuf"} className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                  <option value="Neuf">Neuf</option>
                  <option value="Bon état">Bon état</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Endommagé">Endommagé</option>
                  <option value="En réparation">En réparation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 ml-1">Emplacement</Label>
                <Input name="location" defaultValue={initialData?.location} placeholder="ex: Salle 101" className="rounded-xl border-slate-200 h-11" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
