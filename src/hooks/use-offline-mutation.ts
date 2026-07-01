import { localDb } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";

type OfflineTable = "students" | "exams" | "examResults" | "subjects" | "feePayments";

interface MutationOptions<T> {
  targetTable: OfflineTable;
  onlineAction: (payload: T) => Promise<{ success?: boolean; error?: string; action?: string; id?: number }>;
  onSuccess?: (res: { success: boolean; action?: string; id?: number }) => void;
}

const SYNC_SUPPORTED_TABLES = new Set<OfflineTable>(["students", "exams", "examResults", "feePayments"]);

type OfflineMutationResult = {
  success: boolean;
  error?: string;
  fromCloud?: boolean;
  fromLocal?: boolean;
};

export function useOfflineMutation<T>() {
  const isOnline = useOnlineStatus();

  const mutate = async (payload: T, options: MutationOptions<T>): Promise<OfflineMutationResult> => {
    const { targetTable, onlineAction, onSuccess } = options;

    if (isOnline) {
      try {
        const res = await onlineAction(payload);
        if (res?.success) {
          const localPayload = {
            ...payload,
            id: res.id,
            updatedAt: Date.now(),
          };

          await localDb[targetTable].put(localPayload as any);

          onSuccess?.({ success: true, action: res.action, id: res.id });
          return { success: true, fromCloud: true };
        }

        toast.error(res?.error || "Erreur sur le serveur.");
        return { success: false, error: res?.error };
      } catch (error) {
        console.warn("[useOfflineMutation] Server action failed, falling back to local queue:", error);
        return queueOffline(payload, options);
      }
    }

    return queueOffline(payload, options);
  };

  const queueOffline = async (payload: T, options: MutationOptions<T>) => {
    const { targetTable, onSuccess } = options;

    try {
      if (!SYNC_SUPPORTED_TABLES.has(targetTable)) {
        const message = `La table ${targetTable} n'est pas encore synchronisable hors-ligne.`;
        toast.error(message);
        return { success: false, error: message };
      }

      const localId = (payload as any).id || Math.floor(Math.random() * 1000000);
      const localPayload = {
        ...payload,
        id: localId,
        updatedAt: Date.now(),
      };

      await localDb[targetTable].put(localPayload as any);

      await localDb.outbox.add({
        actionType: (payload as any).id ? "UPDATE" : "INSERT",
        targetTable,
        payload: {
          ...payload,
          id: localId,
        },
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      });

      toast.warning("Modifications enregistrees localement (hors-ligne).");

      const res = { success: true, action: (payload as any).id ? "update" : "insert", id: localId };
      onSuccess?.(res);
      return { success: true, fromLocal: true };
    } catch (error: any) {
      console.error("[useOfflineMutation] IndexedDB error:", error);
      toast.error("Impossible d'enregistrer localement: " + error.message);
      return { success: false, error: error.message };
    }
  };

  return { mutate, isOnline };
}
