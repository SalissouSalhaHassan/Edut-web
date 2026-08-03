"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { returnLibraryBook } from "@/domains/library/actions/library.actions";

interface ReturnBookDialogProps {
  issueId: number;
  bookTitle: string;
  borrowerName: string;
  isOverdue: boolean;
  trigger?: React.ReactNode;
}

export default function ReturnBookDialog({ issueId, bookTitle, borrowerName, isOverdue, trigger }: ReturnBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const fine = Number(form.get("fineAmount")) || 0;

    const result = await returnLibraryBook(issueId, fine);

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

        <button className="text-emerald-600 hover:underline font-bold text-sm">
          Retourner
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-white dark:bg-[#0E1017] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Retour de Livre
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">Livre</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{bookTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 uppercase tracking-widest">Emprunteur</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{borrowerName}</p>
            </div>

            {isOverdue && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Retard détecté</p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-300 font-medium">Le délai de retour est dépassé. Vous pouvez appliquer une amende ci-dessous.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Amende / Pénalité (CFA)</Label>
              <Input name="fineAmount" type="number" defaultValue={0} className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white h-11" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/20 dark:shadow-none">
              {loading ? "Traitement..." : "Confirmer le Retour"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
