import { localDb } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";

type OfflineTable = "students" | "exams" | "examResults" | "subjects" | "feePayments" | "attendanceBatches";

interface MutationOptions<T> {
  targetTable: OfflineTable;
  onlineAction: (payload: T) => Promise<{ success?: boolean; error?: string; action?: string; id?: number }>;
  onSuccess?: (res: { success: boolean; action?: string; id?: number }) => void;
  entity?: string;
  entityId?: string | number | null;
  idempotencyKey?: string;
  userId?: string | number | null;
  schoolId?: string | number | null;
}

const SYNC_SUPPORTED_TABLES = new Set<OfflineTable>(["students", "exams", "examResults", "feePayments", "attendanceBatches"]);

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

      // 1. Resolve userId and schoolId
      let userId: string | number | null = options.userId || null;
      let schoolId: string | number | null = options.schoolId || null;

      if (!userId || !schoolId) {
        try {
          const { createClient } = await import("@/shared/utils/supabase/client");
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (!userId) userId = session.user.id;
            if (!schoolId) {
              schoolId = session.user.user_metadata?.schoolId || session.user.user_metadata?.school_id || null;
            }
          }
        } catch (e) {
          console.warn("[useOfflineMutation] Failed to fetch session from Supabase client Component", e);
        }
      }

      const now = Date.now();
      const idempotencyKey =
        options.idempotencyKey ||
        (payload as any).idempotencyKey ||
        (payload as any).reference ||
        `${targetTable}:${options.entityId || (payload as any).id || crypto.randomUUID?.() || now}`;
      const localId = (payload as any).id || Math.floor(Math.random() * 1000000);
      const localPayload = {
        ...payload,
        id: localId,
        idempotencyKey,
        updatedAt: now,
      };

      await localDb[targetTable].put(localPayload as any);

      const existingQueued = await localDb.outbox
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();

      if (existingQueued && existingQueued.status !== "synced" && existingQueued.status !== "cancelled") {
        await localDb.outbox.update(existingQueued.id!, {
          payload: {
            ...payload,
            id: localId,
            idempotencyKey,
          },
          status: "pending",
          updatedAt: now,
          lastError: null,
          userId,
          schoolId,
        });
      } else {
        await localDb.outbox.add({
          actionType: (payload as any).id ? "UPDATE" : "INSERT",
          targetTable,
          entity: options.entity || targetTable,
          entityId: options.entityId || (payload as any).id || localId,
          payload: {
            ...payload,
            id: localId,
            idempotencyKey,
          },
          status: "pending",
          timestamp: now,
          updatedAt: now,
          retryCount: 0,
          idempotencyKey,
          lastError: null,
          userId,
          schoolId,
        });
      }

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
