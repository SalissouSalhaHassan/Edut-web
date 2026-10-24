import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { behaviorRewards } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq, and, or, isNull, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, badgeName, points = 30, reason = "Attitude positive et engagement remarquable", notifyParent = true } = body;

    if (!studentId || !badgeName) {
      return mobileJsonError("studentId et badgeName sont requis.", 400);
    }

    const schoolId = user.schoolId || 1;

    // Check session freeze
    const sessionCheck = await db.query.schoolSessions.findFirst({
      where: (s, { eq, and, or, isNull }) => and(
        schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: (s, { desc }) => [desc(s.id)],
    });
    if (sessionCheck && (!sessionCheck.isActive || sessionCheck.status === "Clôturé" || sessionCheck.status === "Verrouillé" || sessionCheck.status === "Archivé")) {
      return mobileJsonError(
        `Impossible d'attribuer le badge : l'année scolaire (${sessionCheck.sessionName}) est clôturée ou verrouillée.`,
        403
      );
    }

    // 1. Fetch student
    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const studentName = (student as any).nomEtudiant || "l'élève";
    const parentPhone = (student as any).whatsapp || (student as any).parentWhatsapp || (student as any).mobile;

    // 2. Insert behavior reward
    const [reward] = await db
      .insert(behaviorRewards)
      .values({
        schoolId,
        studentId: Number(studentId),
        rewardType: badgeName,
        pointsEffect: Number(points),
        reason,
        grantedBy: (user as any).nomPrenom || (user as any).name || user.utilisateur || "Enseignant",
      })
      .returning({ id: behaviorRewards.id });

    // 3. Optional WhatsApp notification
    if (notifyParent && parentPhone) {
      const waMsg = `🌟 Félicitations ! Votre enfant ${studentName} vient de recevoir le badge d'honneur : *${badgeName}* (+${points} pts) pour le motif : "${reason}". L'équipe pédagogique d'Edut vous adresse ses félicitations !`;
      try {
        await fetch(`${request.nextUrl.origin}/api/mobile/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: parentPhone,
            message: waMsg,
            schoolId,
          }),
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Badge "${badgeName}" décerné avec succès à ${studentName} !`,
      data: {
        rewardId: reward.id,
        badgeName,
        points,
        awardedTo: studentName,
        awardedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Award Badge API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de l'attribution du badge", 500);
  }
}
