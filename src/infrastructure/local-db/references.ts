import { localDb, type LocalReferenceItem } from "./dexie";

type ReferenceType = LocalReferenceItem["type"];

export async function cacheReferenceItems(type: ReferenceType, items: any[], labelKey: string) {
  const now = Date.now();
  const rows = items.map((item) => ({
    type,
    remoteId: item.id ?? item.value ?? null,
    label: item[labelKey] || item.name || item.label || String(item.id || ""),
    payload: item,
    updatedAt: now,
  }));

  await localDb.references.where("type").equals(type).delete();
  if (rows.length > 0) {
    await localDb.references.bulkPut(rows);
  }
}

export async function getCachedReferenceItems<T = any>(type: ReferenceType): Promise<T[]> {
  const rows = await localDb.references.where("type").equals(type).toArray();
  return rows.map((row) => row.payload as T);
}

export function notifyAcademicFiltersUpdated(detail?: any) {
  try {
    if (typeof window !== "undefined") {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem("academic_filter_options_v2");
      }
      window.dispatchEvent(new CustomEvent("academic_filters_updated", { detail }));
    }
  } catch (e) {
    console.warn("[references] Failed to dispatch academic_filters_updated event:", e);
  }
}

export async function addOrUpdateCachedReferenceItem(
  type: ReferenceType,
  item: any,
  labelKey: string
) {
  const remoteId = item.id ?? item.value ?? null;
  const label = item[labelKey] || item.name || item.label || String(remoteId || "");
  const now = Date.now();

  const existing = await localDb.references
    .where("type")
    .equals(type)
    .filter((r) => String(r.remoteId) === String(remoteId))
    .first();

  if (existing && existing.id) {
    await localDb.references.update(existing.id, {
      label,
      payload: { ...existing.payload, ...item },
      updatedAt: now,
    });
  } else {
    await localDb.references.add({
      type,
      remoteId,
      label,
      payload: item,
      updatedAt: now,
    });
  }

  notifyAcademicFiltersUpdated({ type, item, action: "upsert" });
}

export async function removeCachedReferenceItem(type: ReferenceType, id: number | string) {
  const existing = await localDb.references
    .where("type")
    .equals(type)
    .filter((r) => String(r.remoteId) === String(id) || String((r.payload as any)?.id) === String(id))
    .first();

  if (existing && existing.id) {
    await localDb.references.delete(existing.id);
  }

  notifyAcademicFiltersUpdated({ type, id, action: "delete" });
}

export async function updateCachedReferenceId(
  type: ReferenceType,
  oldId: number | string,
  newId: number | string
) {
  const existing = await localDb.references
    .where("type")
    .equals(type)
    .filter((r) => String(r.remoteId) === String(oldId) || String((r.payload as any)?.id) === String(oldId))
    .first();

  if (existing && existing.id) {
    const updatedPayload = { ...existing.payload, id: newId };
    await localDb.references.update(existing.id, {
      remoteId: newId,
      payload: updatedPayload,
      updatedAt: Date.now(),
    });
    notifyAcademicFiltersUpdated({ type, oldId, newId, action: "id_mapped" });
  }
}

export async function resolveOnlineOrCached<T = any>(
  type: ReferenceType,
  loader: () => Promise<any>,
  labelKey: string,
): Promise<T[]> {
  try {
    const res = await loader();
    const data = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    if (data.length > 0) {
      await cacheReferenceItems(type, data, labelKey);
      return data as T[];
    }
  } catch (error) {
    console.warn(`[references] Falling back to cached ${type}:`, error);
  }

  return getCachedReferenceItems<T>(type);
}

