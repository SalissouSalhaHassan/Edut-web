/**
 * Offline Reference Data Warmer
 * Automatically downloads and caches core reference items (sessions, classes,
 * subjects, grading scales, header config) in IndexedDB when online.
 * This guarantees that when the user goes offline, pages like "Appel & Présence"
 * and "Notes & Résultats" load instantly with complete filter options.
 */

let warmupDone = false;

export async function warmupOfflineReferences() {
  if (typeof window === "undefined" || !navigator.onLine || warmupDone) return;
  warmupDone = true;

  try {
    const { getFilterOptions, getClasses, getGradingAppreciations } = await import(
      "@/domains/academics/actions/academics.actions"
    );
    const { getDocumentHeaderConfig } = await import("@/domains/settings/actions/settings.actions");
    const { cacheReferenceItems } = await import("./references");

    // 1. Fetch & Cache Academic Filter Options (sessions, periods, sections, classes, subjects)
    try {
      const optionsRes = await getFilterOptions();
      const data = (optionsRes as any)?.data || optionsRes;

      if (data && (data.classes || data.sessions)) {
        await Promise.all([
          data.sessions?.length && cacheReferenceItems("session", data.sessions, "sessionName"),
          data.periods?.length && cacheReferenceItems("period", data.periods, "name"),
          data.sections?.length && cacheReferenceItems("section", data.sections, "sectionName"),
          data.classes?.length && cacheReferenceItems("class", data.classes, "className"),
          data.subjects?.length && cacheReferenceItems("subject", data.subjects, "subjectName"),
          cacheReferenceItems("exams" as any, [{
            id: "academic-filter-options",
            label: "academic-filter-options",
            classSubjectLinks: data.classSubjectLinks || [],
            sectionSubjectLinks: data.sectionSubjectLinks || [],
            levels: data.levels || [],
            updatedAt: Date.now(),
          }], "label"),
        ]);
      } else {
        // Fallback: Cache classes directly
        const classesRes = await getClasses(false);
        const classes = (classesRes as any)?.data?.data || (classesRes as any)?.data || [];
        if (Array.isArray(classes) && classes.length > 0) {
          await cacheReferenceItems("class", classes, "className");
        }
      }
    } catch (e) {
      console.debug("[OfflineWarmup] Academic filters warmup skipped:", e);
    }

    // 2. Fetch & Cache Grading Scale / Appreciations
    try {
      const scaleRes = await getGradingAppreciations();
      const scaleData = ((scaleRes as any)?.data?.data || (scaleRes as any)?.data || []) as any[];
      if (Array.isArray(scaleData) && scaleData.length > 0) {
        localStorage.setItem("edut_grading_scale_cache", JSON.stringify(scaleData));
      }
    } catch (e) {
      console.debug("[OfflineWarmup] Grading scale warmup skipped:", e);
    }

    // 3. Fetch & Cache Document Header Config
    try {
      const headerRes = await getDocumentHeaderConfig();
      if (headerRes?.data) {
        localStorage.setItem("edut_header_config_cache", JSON.stringify(headerRes.data));
      }
    } catch (e) {
      console.debug("[OfflineWarmup] Header config warmup skipped:", e);
    }

    // 4. Gently Warm Up Core HTML Page Shells into Service Worker Cache (one by one)
    if ("caches" in window) {
      const CORE_PAGES = [
        "/dashboard",
        "/dashboard/students",
        "/dashboard/attendance",
        "/dashboard/academics",
        "/dashboard/academics/grades",
        "/dashboard/academics/exams",
        "/dashboard/academics/homework",
        "/dashboard/pedagogie/devoirs",
        "/dashboard/admin-docs",
        "/dashboard/id-cards",
        "/dashboard/synchronisation/diagnostic",
      ];

      try {
        const cache = await caches.open("edut-offline-v8");
        for (const pageUrl of CORE_PAGES) {
          try {
            const match = await cache.match(pageUrl);
            if (!match) {
              const resp = await fetch(pageUrl, { credentials: "same-origin" });
              if (resp && resp.ok) {
                await cache.put(pageUrl, resp.clone());
                await cache.put(new Request(pageUrl, { credentials: "same-origin" }), resp);
              }
              // 300ms pause to ensure zero server strain
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (err) {
    console.debug("[OfflineWarmup] Non-critical background warmup error:", err);
  }
}
