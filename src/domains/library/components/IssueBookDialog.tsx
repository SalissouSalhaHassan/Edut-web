"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { issueLibraryBook } from "@/domains/library/actions/library.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { LibraryIssueFormData } from "../validators/library.schema";

interface IssueBookDialogProps {
  bookId: number;
  bookTitle: string;
  trigger?: React.ReactNode;
}

export default function IssueBookDialog({ bookId, bookTitle, trigger }: IssueBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getStudents().then(res => { if (res.data) setStudents(res.data as any); });
      getEmployees().then(res => { if (res.data) setEmployees(res.data as any); });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const borrowerType = form.get("borrowerType") as string;
    
    const data: LibraryIssueFormData = {
      bookId: bookId,
      studentId: borrowerType === "student" ? Number(form.get("borrowerId")) : null,
      employeeId: borrowerType === "employee" ? Number(form.get("borrowerId")) : null,
      dueDate: form.get("dueDate") as string,
    };

    const result = await issueLibraryBook(data);

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  const [type, setType] = useState("student");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (

        <button className="text-primary hover:underline font-bold text-sm">
          Prêter
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            Prêter un Livre
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600 italic">
              Livre: <span className="font-bold text-slate-900 not-italic">{bookTitle}</span>
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Type d'emprunteur</Label>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setType("student")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${type === 'student' ? 'bg-primary text-white border-primary shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100'}`}
                >
                  Étudiant
                </button>
                <button 
                  type="button" 
                  onClick={() => setType("employee")}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${type === 'employee' ? 'bg-primary text-white border-primary shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100'}`}
                >
                  Personnel
                </button>
              </div>
              <input type="hidden" name="borrowerType" value={type} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Sélectionner {type === 'student' ? 'l\'élève' : 'l\'employé'} *</Label>
              <select name="borrowerId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="">-- Choisir --</option>
                {type === "student" ? (
                  students.map(s => <option key={s.id} value={s.id}>{s.nomEtudiant}</option>)
                ) : (
                  employees.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Date de retour prévue *</Label>
              <Input 
                name="dueDate" 
                type="date" 
                required 
                defaultValue={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 
                className="rounded-xl border-slate-200 h-11" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Prêt en cours..." : "Confirmer le Prêt"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
