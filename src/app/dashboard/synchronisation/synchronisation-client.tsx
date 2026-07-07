"use client";

import { useMemo, useState, useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb, type OutboxAction } from "@/infrastructure/local-db/dexie";
import { syncOutbox } from "@/infrastructure/local-db/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  syncing: { label: "Synchronisation", className: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: RefreshCw },
  failed: { label: "Erreur", className: "bg-rose-50 text-rose-700 border-rose-100", icon: XCircle },
  conflict: { label: "Conflit", className: "bg-orange-50 text-orange-700 border-orange-100", icon: AlertTriangle },
  synced: { label: "Synchronise", className: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  cancelled: { label: "Annule", className: "bg-slate-50 text-slate-600 border-slate-100", icon: Trash2 },
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
    if (filter === "pending") return outbox.filter(item => !item.status || item.status === "pending" || item.status === "syncing");
    if (filter === "failed") return outbox.filter(item => item.status === "failed");
    if (filter === "conflict") return outbox.filter(item => item.status === "conflict");
    if (filter === "synced") return outbox.filter(item => item.status === "synced");
    return outbox;
  }, [outbox, filter]);

  const stats = useMemo(() => {
    const counts = { pending: 0, failed: 0, conflict: 0, synced: 0, syncing: 0, total: outbox.length };
    outbox.forEach((item) => {
      const key = (item.status || "pending") as keyof typeof counts;
      if (key in counts) counts[key] += 1;
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
      status: "pending",
      lastError: null,
      updatedAt: Date.now(),
    });
  };

  const cancelItem = async (item: OutboxAction) => {
    if (!item.id) return;
    await localDb.outbox.update(item.id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  };

  const clearSynced = async () => {
    const synced = await localDb.outbox.where("status").equals("synced").toArray();
    await localDb.outbox.bulkDelete(synced.map((item) => item.id!).filter(Boolean));
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
                Suivi des operations locales, erreurs, conflits et envois vers le serveur cloud.
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
            <Button onClick={handleSync} disabled={!isOnline || isPending} className="rounded-2xl bg-indigo-600 font-black text-white">
              <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              Synchroniser maintenant
            </Button>
            <Button onClick={clearSynced} variant="outline" className="rounded-2xl font-black border-slate-200 hover:bg-slate-50">
              Supprimer synchronisés
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
          { label: "En attente", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Erreurs", value: stats.failed, color: "text-rose-700", bg: "bg-rose-50" },
          { label: "Conflits", value: stats.conflict, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Synchronisés", value: stats.synced, color: "text-emerald-700", bg: "bg-emerald-50" },
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
              { value: "pending", label: "En attente" },
              { value: "failed", label: "Erreurs" },
              { value: "conflict", label: "Conflits" },
              { value: "synced", label: "Synchronisés" },
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
            <tbody className="divide-y divide-slate-100">
              {filteredOutbox.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-black text-slate-900">{item.targetTable}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.entity || item.targetTable}</td>
                  <td className="px-5 py-4 text-sm font-black text-indigo-600">{item.actionType}</td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                    {item.userId ? `User: ${String(item.userId).slice(0, 8)}` : "-"} / {item.schoolId ? `School: ${item.schoolId}` : "-"}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-500">{formatDate(item.timestamp)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-500">{formatDate(item.syncedAt)}</td>
                  <td className="px-5 py-4 text-sm font-black text-slate-700">{item.retryCount || 0}</td>
                  <td className="max-w-[240px] truncate px-5 py-4 text-sm font-semibold text-rose-600">{item.lastError || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item)} title="Voir payload">
                        <Eye className="h-4 w-4" />
                      </button>
                      {item.status !== "synced" && (
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
