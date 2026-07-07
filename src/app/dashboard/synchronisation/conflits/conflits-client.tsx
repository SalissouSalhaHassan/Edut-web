"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDb, type OutboxAction } from "@/infrastructure/local-db/dexie";

export default function ConflitsClient() {
  const [selectedItem, setSelectedItem] = useState<OutboxAction | null>(null);
  const conflicts = useLiveQuery(() => localDb.outbox.where("status").equals("conflict").toArray(), []) || [];

  const keepLocal = async (item: OutboxAction) => {
    if (!item.id) return;
    await localDb.outbox.update(item.id, {
      status: "pending",
      lastError: null,
      updatedAt: Date.now(),
    });
  };

  const keepServer = async (item: OutboxAction) => {
    if (!item.id) return;
    await localDb.outbox.update(item.id, {
      status: "cancelled",
      lastError: "Conflit resolu: valeur serveur conservee.",
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="min-h-full p-6 lg:p-8 space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Offline-First Mode</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Conflits de Synchronisation</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Les conflits apparaissent ici lorsqu'une donnee locale et une donnee serveur ne peuvent pas etre fusionnees automatiquement.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Module", "Entite", "Erreur", "Tentatives", "Actions"].map((head) => (
                  <th key={head} className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conflicts.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-black text-slate-900">{item.targetTable}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.entity || item.targetTable}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-orange-700">{item.lastError || "Conflit a resoudre"}</td>
                  <td className="px-5 py-4 text-sm font-black text-slate-700">{item.retryCount || 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl font-black" onClick={() => setSelectedItem(item)}>
                        Voir details
                      </Button>
                      <Button className="rounded-xl bg-indigo-600 font-black text-white" onClick={() => keepLocal(item)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Garder local
                      </Button>
                      <Button variant="outline" className="rounded-xl font-black" onClick={() => keepServer(item)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Garder serveur
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {conflicts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                    Aucun conflit de synchronisation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-xl font-black text-slate-950">Details du conflit</h3>
              <button onClick={() => setSelectedItem(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">
                Fermer
              </button>
            </div>
            <pre className="max-h-[65vh] overflow-auto bg-slate-950 p-5 text-xs text-slate-100">
              {JSON.stringify(selectedItem, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
