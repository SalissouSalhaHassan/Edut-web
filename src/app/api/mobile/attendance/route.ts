import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql, isNull, inArray, or } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentAttendance, teacherSessionAttendance } from "@/infrastructure/database/schema/attendance";
import { timetableEntries, timetableSettings, classSubjects, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    if (action === "getTeacherScheduleAttendance") {
      const employeeId = Number(searchParams.get("employeeId"));
      const filterType = searchParams.get("filterType") || "day";
      const dateStr = searchParams.get("dateStr");

      if (!employeeId || !dateStr) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      // Authorization check: teacher can only query themselves. Other roles must match schoolId.
      if (roleType === "teacher" || roleType === "enseignant") {
        if (user.employeeId !== employeeId) {
          return mobileJsonError("Accès refusé. Non autorisé pour cet enseignant.", 403);
        }
      } else {
        // Fetch employee to check schoolId
        const emp = await readDb.query.employees.findFirst({
          where: eq(employees.id, employeeId),
          columns: { schoolId: true }
        });
        if (!emp || emp.schoolId !== schoolId) {
          return mobileJsonError("Accès refusé. Cet enseignant appartient à une autre école.", 403);
        }
      }

      const baseDate = new Date(dateStr);
      let startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0);
      let endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59);

      if (filterType === "week") {
        const weekday = baseDate.getDay() || 7;
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - (weekday - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (filterType === "month") {
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59);
      } else if (filterType === "year") {
        startDate = new Date(baseDate.getFullYear(), 0, 1, 0, 0, 0);
        endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59);
      }

      // 1. Fetch timetable entries
      const timetableList = await readDb.query.timetableEntries.findMany({
        where: eq(timetableEntries.employeeId, employeeId),
        with: {
          class: true,
          subject: true,
        }
      });

      // 2. Fetch attendance scans in date range
      const scansList = await readDb.query.teacherSessionAttendance.findMany({
        where: and(
          eq(teacherSessionAttendance.employeeId, employeeId),
          gte(teacherSessionAttendance.date, startDate),
          lte(teacherSessionAttendance.date, endDate)
        )
      });

      // Create lookup map
      const attendanceMap = new Map<string, any>();
      for (const scan of scansList) {
        if (scan.date) {
          const scanDate = new Date(scan.date);
          const dStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`;
          const key = `${dStr}_${scan.periodNumber}_${scan.classId}`;
          attendanceMap.set(key, scan);
        }
      }

      // 3. Generate all dates in range
      const dates: Date[] = [];
      let curr = new Date(startDate);
      while (curr <= endDate) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      const daysNameFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const getDayName = (dayIndex: number) => {
        return daysNameFr[dayIndex] || "Lundi";
      };

      const slots: any[] = [];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      for (const date of dates) {
        const dayName = getDayName(date.getDay());
        const dailyTimetable = timetableList.filter((t) => t.dayName === dayName);

        for (const entry of dailyTimetable) {
          const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const key = `${dStr}_${entry.periodNumber}_${entry.classId}`;
          const match = attendanceMap.get(key);

          let status = "Absent";
          let scannedAt = null;
          let scanMethod = null;
          let remarques = null;
          let attendanceRecordId = null;

          if (match) {
            status = match.status || "Présent";
            scannedAt = match.scannedAt?.toISOString() || null;
            scanMethod = match.scanMethod || null;
            remarques = match.remarques || null;
            attendanceRecordId = match.id;
          } else {
            if (dStr.localeCompare(todayStr) > 0) {
              status = "Planifié";
            } else if (dStr === todayStr) {
              status = "Planifié";
            }
          }

          slots.push({
            date: date.toISOString(),
            dateStr: dStr,
            dayName: dayName,
            periodNumber: entry.periodNumber,
            classId: entry.classId,
            className: entry.class?.className || "Classe",
            subjectName: entry.subject?.subjectName || "Matière",
            subjectCode: entry.subject?.subjectCode || "",
            roomName: entry.roomName || "Non spécifiée",
            timetableEntryId: entry.id,
            status: status,
            scannedAt: scannedAt,
            scanMethod: scanMethod,
            remarques: remarques,
            attendanceRecordId: attendanceRecordId,
          });
        }
      }

      // Sort slots chronologically
      slots.sort((a, b) => {
        const comp = a.dateStr.localeCompare(b.dateStr);
        if (comp !== 0) return comp;
        return a.periodNumber - b.periodNumber;
      });

      // Calculate stats
      const total = slots.length;
      const attended = slots.filter((s) => s.status === "Présent" || s.status === "En Retard").length;
      const absent = slots.filter((s) => s.status === "Absent").length;
      const late = slots.filter((s) => s.status === "En Retard").length;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

      return NextResponse.json({
        success: true,
        slots,
        stats: {
          total,
          attended,
          absent,
          late,
          rate,
        }
      });
    }

    if (action === "getStudentsByClass") {
      const className = searchParams.get("className");

      if (!className) {
        return mobileJsonError("className manquant", 400);
      }

      // Enforce schoolId scope
      const cond = [
        eq(students.classe, className),
        eq(students.statut, "Actif"),
      ];
      if (schoolId) {
        cond.push(eq(students.schoolId, schoolId));
      }

      const classStudents = await readDb.query.students.findMany({
        where: and(...cond),
        orderBy: students.nomEtudiant,
      });

      // Return snake_case matching mobile repo expected properties
      const list = classStudents.map((s) => ({
        id: s.id,
        num_admission: s.numAdmission,
        nom_etudiant: s.nomEtudiant,
        photo_path: s.photoPath,
        mobile: s.mobile,
        whatsapp: s.whatsapp,
      }));

      return NextResponse.json({
        success: true,
        data: list
      });
    }

    if (action === "getStudentAttendanceRecords") {
      const classId = Number(searchParams.get("classId"));
      const dateStr = searchParams.get("dateStr");
      const subjectId = searchParams.get("subjectId") ? Number(searchParams.get("subjectId")) : null;

      if (!classId || !dateStr) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      const targetDate = new Date(dateStr);
      const cond = [
        eq(studentAttendance.classId, classId),
        sql`DATE(${studentAttendance.date}) = DATE(${targetDate.toISOString()})`
      ];

      if (subjectId) {
        cond.push(eq(studentAttendance.subjectId, subjectId));
      } else {
        cond.push(isNull(studentAttendance.subjectId));
      }

      const records = await readDb.query.studentAttendance.findMany({
        where: and(...cond),
      });

      const list = records.map((r) => ({
        id: r.id,
        student_id: r.studentId,
        status: r.status,
        remark: r.remark,
      }));

      return NextResponse.json({
        success: true,
        data: list
      });
    }

    if (action === "getTeacherClassesAndSubjects") {
      const employeeId = Number(searchParams.get("employeeId"));
      if (!employeeId) {
        return mobileJsonError("employeeId manquant", 400);
      }

      // Check teacher matches user.employeeId if role is teacher
      if (roleType === "teacher" || roleType === "enseignant") {
        if (user.employeeId !== employeeId) {
          return mobileJsonError("Accès refusé", 403);
        }
      }

      const response = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.employeeId, employeeId),
        with: {
          class: true,
          subject: true,
        }
      });

      const list = response.map((row) => ({
        class_id: row.classId,
        subject_id: row.subjectId,
        school_classes: row.class ? { class_name: row.class.className } : null,
        school_subjects: row.subject ? { subject_name: row.subject.subjectName } : null,
      }));

      return NextResponse.json({
        success: true,
        data: list
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur serveur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return mobileJsonError("Paramètres 'action' ou 'payload' manquants", 400);
    }

    if (action === "recordTeacherSessionScan") {
      const { classId, employeeId } = payload;
      if (!classId || !employeeId) {
        return mobileJsonError("Paramètres classId ou employeeId manquants", 400);
      }

      // Verify authorization: teacher may only record their own scan
      if (roleType === "teacher" || roleType === "enseignant") {
        // user.employeeId from session may be null if cache is stale — fall back to DB
        let resolvedEmpId = user.employeeId;
        if (resolvedEmpId == null) {
          const empFromDb = await readDb.query.employees.findFirst({
            where: and(eq(employees.schoolId, schoolId!), eq(employees.email, user.utilisateur))
          });
          resolvedEmpId = empFromDb?.id ?? null;
        }
        if (resolvedEmpId == null || Number(resolvedEmpId) !== Number(employeeId)) {
          return mobileJsonError("Accès refusé", 403);
        }
      }

      const now = new Date();
      const daysNameFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const todayDayName = daysNameFr[now.getDay()] || "Lundi";

      // 1. Get today's timetable entries for this class and teacher
      const todayEntries = await readDb.query.timetableEntries.findMany({
        where: and(
          eq(timetableEntries.classId, classId),
          eq(timetableEntries.employeeId, employeeId),
          eq(timetableEntries.dayName, todayDayName)
        ),
        with: {
          class: true,
          subject: true,
        }
      });

      if (todayEntries.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Aucune séance de cours n'est programmée pour vous dans cette classe aujourd'hui (${todayDayName}).`,
        });
      }

      // 2. Get classroom settings to evaluate period times
      const settingsList = await readDb.query.timetableSettings.findMany({
        where: and(
          isNull(timetableSettings.classId),
          schoolId ? eq(timetableSettings.id, schoolId) : undefined
        )
      });

      const settings = settingsList[0] || null;
      const dayStartStr = settings?.dayStart || "08:00";
      const periodDuration = settings?.periodDuration || 60;
      const recessAfter = settings?.recessAfter || 3;
      const recessDuration = settings?.recessDuration || 30;

      // Parse day start
      const parts = dayStartStr.split(":");
      const startH = parseInt(parts[0] || "8", 10);
      const startM = parseInt(parts[1] || "0", 10);
      const startMinutes = startH * 60 + startM;

      const getPeriodStartMinutes = (period: number) => {
        let offset = (period - 1) * periodDuration;
        if (period > recessAfter) {
          offset += recessDuration;
        }
        return startMinutes + offset;
      };

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let resolvedEntry = todayEntries[0]!;
      let minDiff = 999999;

      for (const entry of todayEntries) {
        const period = entry.periodNumber;
        const start = getPeriodStartMinutes(period);
        const end = start + periodDuration;

        if (currentMinutes >= start - 20 && currentMinutes <= end + 20) {
          resolvedEntry = entry;
          minDiff = 0;
          break;
        } else {
          const diff = Math.abs(currentMinutes - start);
          if (diff < minDiff) {
            minDiff = diff;
            resolvedEntry = entry;
          }
        }
      }

      const resolvedPeriod = resolvedEntry.periodNumber;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // 3. Check if attendance already recorded for this slot today
      const existingScans = await readDb.query.teacherSessionAttendance.findMany({
        where: and(
          eq(teacherSessionAttendance.employeeId, employeeId),
          eq(teacherSessionAttendance.classId, classId),
          eq(teacherSessionAttendance.periodNumber, resolvedPeriod),
          gte(teacherSessionAttendance.date, new Date(`${todayStr}T00:00:00`)),
          lte(teacherSessionAttendance.date, new Date(`${todayStr}T23:59:59`))
        )
      });

      if (existingScans.length > 0) {
        const existing = existingScans[0]!;
        return NextResponse.json({
          success: true,
          alreadyRecorded: true,
          entry: {
            periodNumber: resolvedPeriod,
            subjectName: resolvedEntry.subject?.subjectName || "Matière",
            className: resolvedEntry.class?.className || "Classe",
            scannedAt: existing.scannedAt?.toISOString(),
          },
        });
      }

      // Fetch teacher's school ID
      const emp = await readDb.query.employees.findFirst({
        where: eq(employees.id, employeeId),
        columns: { schoolId: true }
      });
      const empSchoolId = emp?.schoolId || schoolId;

      // 4. Insert new attendance record
      const newRecord = {
        schoolId: empSchoolId,
        employeeId,
        classId,
        subjectId: resolvedEntry.subjectId,
        timetableEntryId: resolvedEntry.id,
        date: now,
        periodNumber: resolvedPeriod,
        status: "Présent",
        scanMethod: "QR_CODE",
        scannedAt: now,
      };

      await db.insert(teacherSessionAttendance).values(newRecord);

      return NextResponse.json({
        success: true,
        entry: {
          periodNumber: resolvedPeriod,
          subjectName: resolvedEntry.subject?.subjectName || "Matière",
          className: resolvedEntry.class?.className || "Classe",
          scannedAt: now.toISOString(),
        },
      });
    }

    if (action === "saveStudentBatchAttendance") {
      const { classId, dateStr, subjectId, employeeId, records, sendSMS, sendWhatsApp } = payload;
      if (!classId || !dateStr || !records) {
        return mobileJsonError("Paramètres classId, dateStr ou records manquants", 400);
      }

      // Verify class belongs to user's school
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        columns: { schoolId: true }
      });
      if (!cls || cls.schoolId !== schoolId) {
        return mobileJsonError("Accès refusé. Classe introuvable ou appartient à un autre établissement.", 403);
      }

      const targetDate = new Date(dateStr);

      // Fetch existing student attendance records for the target date, class, and subject
      const existing = await readDb.query.studentAttendance.findMany({
        where: and(
          eq(studentAttendance.classId, classId),
          subjectId ? eq(studentAttendance.subjectId, subjectId) : isNull(studentAttendance.subjectId),
          sql`DATE(${studentAttendance.date}) = DATE(${targetDate.toISOString()})`
        )
      });

      const existingMap = new Map(existing.map((r) => [r.studentId, r.id]));

      await Promise.all(
        records.map(async (record: any) => {
          const studentId = Number(record.student_id);
          const status = String(record.status);
          const remark = record.remark ? String(record.remark) : null;
          const existingId = existingMap.get(studentId);

          if (existingId) {
            await db
              .update(studentAttendance)
              .set({
                status,
                remark,
                employeeId: employeeId ? Number(employeeId) : null,
              })
              .where(eq(studentAttendance.id, existingId));
          } else {
            await db.insert(studentAttendance).values({
              studentId,
              classId,
              subjectId: subjectId ? Number(subjectId) : null,
              employeeId: employeeId ? Number(employeeId) : null,
              date: targetDate,
              status,
              remark,
              recordedBy: "Mobile app",
            });
          }
        })
      );

      // Alerts processing
      const flaggedRecords = records.filter((r: any) => r.status === "Absent" || r.status === "En Retard");
      if (flaggedRecords.length > 0 && (sendSMS || sendWhatsApp)) {
        try {
          const { MessagingService } = await import("@/shared/services/messaging.service");
          const studentIds = flaggedRecords.map((r: any) => Number(r.student_id));
          const targetStudents = await readDb.query.students.findMany({
            where: inArray(students.id, studentIds)
          });

          let subName = "Général";
          if (subjectId) {
            const sub = await readDb.query.schoolSubjects.findFirst({
              where: eq(schoolSubjects.id, subjectId)
            });
            if (sub) subName = sub.subjectName;
          }

          const formattedDate = targetDate.toLocaleDateString("fr-FR");

          for (const record of flaggedRecords) {
            const sId = Number(record.student_id);
            const s = targetStudents.find((st) => st.id === sId);
            if (s && (s.mobile || s.whatsapp)) {
              await MessagingService.sendAttendanceAlert({
                to: s.mobile || "",
                whatsapp: s.whatsapp || s.mobile || "",
                studentName: s.nomEtudiant,
                status: record.status as any,
                subject: subName,
                date: formattedDate,
                sendSMS,
                sendWhatsApp,
              });
            }
          }
        } catch (err) {
          console.error("Failed to send messaging alerts from mobile API:", err);
        }
      }

      return NextResponse.json({ success: true });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur serveur: ${err.message || err}`, 500);
  }
}
