import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, readDb, withTenant } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError, canUseMobileModule } from "../_lib/auth";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { cahierTextes } from "@/infrastructure/database/schema/pedagogie";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { homework } from "@/infrastructure/database/schema/homework";
import { feePayments } from "@/infrastructure/database/schema/finance";
import { disciplineIncidents } from "@/infrastructure/database/schema/discipline";

export const dynamic = "force-dynamic";

interface SyncOperationItem {
  id?: string;
  table: string;
  action: string;
  data: Record<string, any>;
  timestamp?: string;
  idempotencyKey?: string;
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  if (!user.schoolId) {
    return mobileJsonError("Utilisateur non rattaché à un établissement.", 403);
  }

  const schoolId = user.schoolId;

  try {
    const body = await request.json();
    const operations: SyncOperationItem[] = Array.isArray(body.operations)
      ? body.operations
      : body.table && body.action
      ? [body]
      : [];

    if (!operations.length) {
      return mobileJsonError("Aucune opération de synchronisation fournie.", 400);
    }

    const results: Array<{ id?: string; success: boolean; error?: string; data?: any }> = [];

    for (const op of operations) {
      const { id, table, action, data } = op;

      try {
        // Enforce Server-Side Validation & Tenant Isolation per Domain
        if (table === "student_attendance" || table === "attendance") {
          const permitted = await canUseMobileModule(user, "attendance", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le module Présence." });
            continue;
          }

          if (action === "batch_attendance" && Array.isArray(data.records)) {
            const dateStr = data.dateStr || new Date().toISOString().split("T")[0];
            const records = data.records;

            await db.transaction(async (tx) => {
              for (const rec of records) {
                const studentId = Number(rec.studentId);
                const status = rec.status || "present";
                const justification = rec.justification || null;
                const remarks = rec.remarks || null;

                if (!studentId) continue;

                // Check existing record for that student and date
                const existing = await tx.query.studentAttendance.findFirst({
                  where: and(
                    eq(studentAttendance.schoolId, schoolId),
                    eq(studentAttendance.studentId, studentId),
                    eq(studentAttendance.date, dateStr)
                  ),
                });

                if (existing) {
                  await tx
                    .update(studentAttendance)
                    .set({
                      status,
                      justification,
                      remarks,
                      updatedAt: new Date(),
                    })
                    .where(eq(studentAttendance.id, existing.id));
                } else {
                  await tx.insert(studentAttendance).values({
                    schoolId,
                    studentId,
                    date: dateStr,
                    status,
                    justification,
                    remarks,
                    recordedBy: user.id,
                  });
                }
              }
            });

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Format d'opération Présence non supporté." });
          }
        } else if (table === "cahier_textes" || table === "pedagogie") {
          const permitted = await canUseMobileModule(user, "pedagogie", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le Cahier de textes." });
            continue;
          }

          if (action === "create_seance") {
            const [created] = await db
              .insert(cahierTextes)
              .values({
                schoolId,
                classId: Number(data.classId),
                subjectId: Number(data.subjectId),
                employeeId: Number(data.employeeId || user.employeeId),
                sessionDate: data.sessionDate || data.dateSeance || new Date().toISOString().split("T")[0],
                titreLecon: data.titreLecon || data.titre || "Séance",
                heureDebut: data.heureDebut,
                heureFin: data.heureFin,
                objectifs: data.objectifs,
                contenuRealise: data.contenuRealise || data.contenu,
                supportsUtilises: data.supportsUtilises,
                devoirDonne: data.devoirDonne || data.devoirMaison,
                observation: data.observation || data.remarques,
                statut: data.statut || "En attente",
              })
              .returning();

            results.push({ id, success: true, data: { id: created?.id } });
          } else if (action === "update_seance" && data.id) {
            await db
              .update(cahierTextes)
              .set({
                titreLecon: data.titreLecon || data.titre,
                heureDebut: data.heureDebut,
                heureFin: data.heureFin,
                objectifs: data.objectifs,
                contenuRealise: data.contenuRealise || data.contenu,
                supportsUtilises: data.supportsUtilises,
                devoirDonne: data.devoirDonne || data.devoirMaison,
                observation: data.observation || data.remarques,
                statut: data.statut || "En attente",
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(cahierTextes.id, Number(data.id)),
                  eq(cahierTextes.schoolId, schoolId)
                )
              );

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Action Cahier de textes inconnue." });
          }
        } else if (table === "student_results" || table === "academics") {
          const permitted = await canUseMobileModule(user, "academics", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour la saisie des notes." });
            continue;
          }

          if (action === "save_grades" && Array.isArray(data.grades)) {
            await db.transaction(async (tx) => {
              for (const g of data.grades) {
                const studentId = Number(g.studentId);
                const examId = Number(g.examId);
                const mark = Number(g.mark || g.note || 0);

                if (!studentId || !examId) continue;

                const existing = await tx.query.studentResults.findFirst({
                  where: and(
                    eq(studentResults.studentId, studentId),
                    eq(studentResults.examId, examId)
                  ),
                });

                if (existing) {
                  await tx
                    .update(studentResults)
                    .set({
                      mark: sql`${mark}`,
                      comment: g.comment || null,
                      updatedAt: new Date(),
                    })
                    .where(eq(studentResults.id, existing.id));
                } else {
                  await tx.insert(studentResults).values({
                    studentId,
                    examId,
                    mark: sql`${mark}`,
                    comment: g.comment || null,
                  });
                }
              }
            });

            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: "Format de notes non reconnu." });
          }
        } else if (table === "fee_payments" || table === "finance") {
          const permitted = await canUseMobileModule(user, "finance", "canEdit");
          if (!permitted) {
            results.push({ id, success: false, error: "Permission insuffisante pour le module Finance." });
            continue;
          }

          if (action === "record_payment") {
            const amount = Number(data.amount || 0);
            const feeId = Number(data.feeId);

            if (!feeId || amount <= 0) {
              results.push({ id, success: false, error: "Montant ou référence de frais invalide." });
              continue;
            }

            const [created] = await db
              .insert(feePayments)
              .values({
                schoolId,
                feeStructureId: feeId,
                studentId: Number(data.studentId),
                amount: sql`${amount}`,
                paymentMode: data.paymentMode || "cash",
                reference: data.reference || `REC-${Date.now()}`,
                paidAt: new Date(),
                recordedBy: user.id,
              })
              .returning();

            results.push({ id, success: true, data: { id: created?.id } });
          } else {
            results.push({ id, success: false, error: "Action financière non supportée." });
          }
        } else {
          results.push({
            id,
            success: false,
            error: `Entité '${table}' non autorisée pour la synchronisation directe.`,
          });
        }
      } catch (opErr: any) {
        console.error(`[Sync API] Error processing op ${id} on ${table}:${action}:`, opErr);
        results.push({
          id,
          success: false,
          error: opErr.message || "Erreur interne de synchronisation serveur.",
        });
      }
    }

    const allSuccessful = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccessful,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Sync API] Critical Handler Error:", error);
    return mobileJsonError(error.message || "Erreur serveur lors de la synchronisation.", 500);
  }
}
