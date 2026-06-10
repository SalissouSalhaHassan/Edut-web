"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { assignItem } from "@/domains/inventory/actions/inventory.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { InventoryAssignmentFormData } from "../validators/inventory.schema";

interface InventoryAssignmentDialogProps {
  itemId: number;
  itemName: string;
  maxQty: number;
  trigger?: React.ReactNode;
}

export default function InventoryAssignmentDialog({ itemId, itemName, maxQty, trigger }: InventoryAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getEmployees().then(res => {
        if (res.data) setEmployeesList(res.data as any as any[]);
      });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: InventoryAssignmentFormData = {
      itemId: itemId,
      employeeId: Number(form.get("employeeId")),
      assignedQty: Number(form.get("assignedQty")) || 1,
      notes: form.get("notes") as string,
    };

    const result = await assignItem(data);

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

        <button className="text-primary hover:underline font-bold text-sm">
          Assigner
        </button>
      
        )}
      </div>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
            Assigner du Matériel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600">
              Article: <span className="font-bold text-slate-900">{itemName}</span> (Dispo: {maxQty})
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Employé / Staff *</Label>
              <select name="employeeId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-sm font-medium outline-none">
                <option value="">-- Choisir --</option>
                {employeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nom}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Quantité à confier *</Label>
              <Input name="assignedQty" type="number" defaultValue={1} min={1} max={maxQty} required className="rounded-xl border-slate-200 h-11" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 ml-1">Notes / Raison</Label>
              <Input name="notes" placeholder="ex: Pour usage au labo" className="rounded-xl border-slate-200 h-11" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 font-bold h-11 shadow-lg shadow-indigo-100">
              {loading ? "Assignation..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
