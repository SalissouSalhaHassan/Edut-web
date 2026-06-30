import { useOnlineStatus } from './use-online-status';
import { localDb } from '@/infrastructure/local-db/dexie';
import { toast } from 'sonner';

interface MutationOptions<T> {
  targetTable: 'students' | 'exams' | 'examResults' | 'subjects';
  onlineAction: (payload: T) => Promise<{ success: boolean; error?: string; action?: string; id?: number }>;
  onSuccess?: (res: { success: boolean; action?: string; id?: number }) => void;
}

export function useOfflineMutation<T>() {
  const isOnline = useOnlineStatus();

  const mutate = async (payload: T, options: MutationOptions<T>) => {
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

          if (onSuccess) onSuccess(res);
          return { success: true, fromCloud: true };
        } else {
          toast.error(res?.error || "Erreur sur le serveur.");
          return { success: false, error: res?.error };
        }
      } catch (err: any) {
        console.warn("[useOfflineMutation] Server action failed, falling back to local queue:", err);
        return await queueOffline(payload, options);
      }
    } else {
      return await queueOffline(payload, options);
    }
  };

  const queueOffline = async (payload: T, options: MutationOptions<T>) => {
    const { targetTable, onSuccess } = options;
    try {
      const localId = (payload as any).id || Math.floor(Math.random() * 1000000);
      const localPayload = {
        ...payload,
        id: localId,
        updatedAt: Date.now(),
      };

      await localDb[targetTable].put(localPayload as any);

      await localDb.outbox.add({
        actionType: (payload as any).id ? 'UPDATE' : 'INSERT',
        targetTable,
        payload: {
          ...payload,
          id: localId,
        },
        timestamp: Date.now(),
      });

      toast.warning("Modifications enregistrées localement (Hors-ligne).");
      
      const res = { success: true, action: (payload as any).id ? 'update' : 'insert', id: localId };
      if (onSuccess) onSuccess(res);
      return { success: true, fromLocal: true };
    } catch (err: any) {
      console.error("[useOfflineMutation] IndexedDB error:", err);
      toast.error("Impossible d'enregistrer localement: " + err.message);
      return { success: false, error: err.message };
    }
  };

  return { mutate, isOnline };
}
