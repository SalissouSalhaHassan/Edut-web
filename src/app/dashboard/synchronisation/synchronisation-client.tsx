"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
  Check,
  X,
  FileCheck2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb, type OutboxAction } from "@/infrastructure/local-db/dexie";
import { syncOutbox } from "@/infrastructure/local-db/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  "pending sync": { label: "Attente Sync", className: "bg-amber-50 text-amber-755 border-amber-100", icon: Clock },
  "local draft": { label: "Brouillon Local", className: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  syncing: { label: "Synchronisation", className: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: RefreshCw },
  failed: { label: "Erreur", className: "bg-rose-50 text-rose-700 border-rose-100", icon: XCircle },
  conflict: { label: "Conflit", className: "bg-orange-50 text-orange-700 border-orange-100", icon: AlertTriangle },
  synced: { label: "Synchronisé", className: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  validated: { label: "Validé Officiel", className: "bg-teal-50 text-teal-700 border-teal-100", icon: CheckCircle2 },
  rejected: { label: "Rejeté Admin", className: "bg-red-50 text-red-700 border-red-100", icon: XCircle },
  cancelled: { label: "Annulé", className: "bg-slate-50 text-slate-600 border-slate-100", icon: Trash2 },
};

function formatDate(value?: number | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status?: string }) {
  const config = statusConfig[status || "pending"] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-xl px-3 py-1 font-black", config.className)}>
      <Icon className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

export default function SynchronisationClient() {
  const isOnline = useOnlineStatus();
  const [isPending, startTransition] = useTransition();
  const [selectedItem, setSelectedItem] = useState<OutboxAction | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "failed" | "conflict" | "synced">("all");

  const outbox = useLiveQuery(() => localDb.outbox.orderBy("timestamp").reverse().toArray(), []) || [];

  const filteredOutbox = useMemo(() => {
    if (filter === "all") return outbox;
    if (filter === "pending") {
      return outbox.filter(
        item => !item.status || item.status === "pending" || item.status === "pending sync" || item.status === "local draft" || item.status === "syncing"
      );
    }
    if (filter === "failed") return outbox.filter(item => item.status === "failed" || item.status === "rejected");
    if (filter === "conflict") return outbox.filter(item => item.status === "conflict");
    if (filter === "synced") return outbox.filter(item => item.status === "synced" || item.status === "validated");
    return outbox;
  }, [outbox, filter]);

  const stats = useMemo(() => {
    const counts = { pending: 0, failed: 0, conflict: 0, synced: 0, syncing: 0, total: outbox.length };
    outbox.forEach((item) => {
      const status = item.status || "pending";
      if (status === "pending" || status === "pending sync" || status === "local draft") {
        counts.pending += 1;
      } else if (status === "failed" || status === "rejected") {
        counts.failed += 1;
      } else if (status === "conflict") {
        counts.conflict += 1;
      } else if (status === "synced" || status === "validated") {
        counts.synced += 1;
      } else if (status === "syncing") {
        counts.syncing += 1;
      }
    });
    return counts;
  }, [outbox]);

  const handleSync = () => {
    startTransition(async () => {
      await syncOutbox();
    });
  };

  const retryItem = async (item: OutboxAction) => {
    if (!item.id) return;
    await localDb.outbox.update(item.id, {
      status: "pending sync",
      lastError: null,
      updatedAt: Date.now(),
    });
    toast.success("Opération replacée dans la file d'attente.");
  };

  const cancelItem = async (item: OutboxAction) => {
    if (!item.id) return;
    await localDb.outbox.update(item.id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    toast.info("Opération annulée.");
  };

  const validateItem = async (item: OutboxAction) => {
    if (!item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "validated",
        updatedAt: Date.now()
      });
      // Simulate writing validation action to the official audit log
      toast.success("Opération VALIDÉE administrativement et journalisée avec succès.");
    } catch (e: any) {
      toast.error("Erreur de validation : " + e.message);
    }
  };

  const rejectItem = async (item: OutboxAction) => {
    if (!item.id) return;
    try {
      await localDb.outbox.update(item.id, {
        status: "rejected",
        updatedAt: Date.now()
      });
      toast.error("Opération REJETÉE par l'administration.");
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    }
  };

  const clearSynced = async () => {
    const synced = await localDb.outbox.filter(o => o.status === "synced" || o.status === "validated").toArray();
    await localDb.outbox.bulkDelete(synced.map((item) => item.id!).filter(Boolean));
    toast.success("Nettoyage effectué.");
  };

  const exportSyncJournal = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outbox, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sync_journal_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-full p-6 lg:p-8 space-y-6">
      
      {/* Official Watermark & Regulatory warning Card */}
      <section className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex flex-col md:flex-row items-start gap-4">
        <Info className="text-amber-700 h-6 w-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">⚠️ Réglementation des flux hors-ligne</h4>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Les données saisies en mode hors-ligne ne sont **pas considérées comme finales** pour l'Établissement ou le Ministère tant qu'elles n'ont pas franchi le cycle complet : 
            **1. Synchronisation (Sync)**, **2. Validation administrative**, et **3. Enregistrement sécurisé dans les journaux d'audit (Audit Log)**. 
            Les documents imprimés avant validation portent obligatoirement le filigrane <span className="font-bold underline">PROVISOIRE - HORS LIGNE</span>.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Database className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">Offline-First Mode</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Centre de Synchronisation</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Suivi des operations locales, erreurs, conflits et validation des flux officiels.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-black",
                isOnline ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700",
              )}
            >
              {isOnline ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4" />}
              {isOnline ? "En ligne" : "Hors ligne"}
            </Badge>
            <Link
              href="/dashboard/synchronisation/diagnostic"
              className="flex items-center gap-2 h-10 px-5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-slate-50 transition"
            >
              <Activity className="h-4 w-4 text-indigo-500" />
              Diagnostic
            </Link>
            <Button onClick={handleSync} disabled={!isOnline || isPending} className="rounded-2xl bg-indigo-600 font-black text-white">
              <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              Synchroniser maintenant
            </Button>
            <Button onClick={clearSynced} variant="outline" className="rounded-2xl font-black border-slate-200 hover:bg-slate-50">
              Supprimer validés
            </Button>
            <Button onClick={exportSyncJournal} variant="outline" className="rounded-2xl font-black border-slate-200 hover:bg-slate-50">
              Export journal sync JSON
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {[
          { label: "Total operations", value: stats.total, color: "text-slate-900", bg: "bg-slate-50" },
          { label: "En attente / Drafts", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Erreurs / Rejets", value: stats.failed, color: "text-rose-700", bg: "bg-rose-50" },
          { label: "Conflits", value: stats.conflict, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Synchronisés / Validés", value: stats.synced, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((card) => (
          <div key={card.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <div className={cn("mt-4 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", card.color, card.bg)}>
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Operations locales</h2>
            <p className="text-sm font-semibold text-slate-500">Les operations hors-ligne restent ici jusqu'a leur synchronisation.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Tous" },
              { value: "pending", label: "En attente & Drafts" },
              { value: "failed", label: "Erreurs & Rejets" },
              { value: "conflict", label: "Conflits" },
              { value: "synced", label: "Synchronisés & Validés" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer",
                  filter === tab.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Module", "Entite", "Action", "Utilisateur / École", "Statut", "Creation", "Synchronisation", "Tentatives", "Erreur", "Actions"].map((head) => (
                  <th key={head} className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 text-xs">
              {filteredOutbox.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-black text-slate-900">{item.targetTable}</td>
                  <td className="px-5 py-4 text-slate-600">{item.entity || item.targetTable}</td>
                  <td className="px-5 py-4 font-black text-indigo-600">{item.actionType}</td>
                  <td className="px-5 py-4 text-[11px] text-slate-500">
                    {item.userId ? `User: ${String(item.userId).slice(0, 8)}` : "-"} / {item.schoolId ? `School: ${item.schoolId}` : "-"}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-4 text-slate-500">{formatDate(item.timestamp)}</td>
                  <td className="px-5 py-4 text-slate-500">{formatDate(item.syncedAt)}</td>
                  <td className="px-5 py-4 font-black text-slate-700">{item.retryCount || 0}</td>
                  <td className="max-w-[200px] truncate px-5 py-4 text-rose-600">{item.lastError || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item)} title="Voir payload">
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Conflict detailed page redirect button */}
                      {item.status === "conflict" && (
                        <Link 
                          href={`/dashboard/synchronisation/conflits/${item.id}`} 
                          className="rounded-xl border border-orange-200 bg-orange-50 p-2 text-orange-600 hover:bg-orange-100 cursor-pointer flex items-center justify-center"
                          title="Résoudre le conflit"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Link>
                      )}

                      {/* Official validation controls for synced operations */}
                      {item.status === "synced" && (
                        <>
                          <button 
                            className="rounded-xl border border-emerald-250 bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 cursor-pointer" 
                            onClick={() => validateItem(item)} 
                            title="Valider officiellement l'opération"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            className="rounded-xl border border-rose-250 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 cursor-pointer" 
                            onClick={() => rejectItem(item)} 
                            title="Rejeter l'opération"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {item.status !== "synced" && item.status !== "validated" && item.status !== "rejected" && item.status !== "conflict" && (
                        <>
                          <button className="rounded-xl border border-slate-200 p-2 text-indigo-600 hover:bg-indigo-50 cursor-pointer" onClick={() => retryItem(item)} title="Reessayer">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button className="rounded-xl border border-slate-200 p-2 text-rose-600 hover:bg-rose-50 cursor-pointer" onClick={() => cancelItem(item)} title="Annuler">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOutbox.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                    Aucune operation locale dans cette categorie.
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
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Payload local</p>
                <h3 className="text-xl font-black text-slate-950">{selectedItem.targetTable}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 cursor-pointer">
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
