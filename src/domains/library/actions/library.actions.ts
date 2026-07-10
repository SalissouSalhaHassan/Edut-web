"use server";

import { db } from "@/infrastructure/database";
import { libraryBooks, libraryIssues } from "@/infrastructure/database/schema/library";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { libraryBookSchema, libraryIssueSchema, LibraryBookFormData, LibraryIssueFormData } from "../validators/library.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

// --- Books ---
export async function getLibraryBooks() {
  return protectedDbAction("Library", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.libraryBooks.findMany({
      where: eq(libraryBooks.schoolId, schoolId),
      orderBy: [desc(libraryBooks.createdAt)],
    });
    return { data };
  });
}

export async function createLibraryBook(formData: LibraryBookFormData) {
  const validation = libraryBookSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await db.insert(libraryBooks).values({
      ...validation.data,
      schoolId,
      availableQuantity: validation.data.totalQuantity,
    });
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function updateLibraryBook(id: number, formData: LibraryBookFormData) {
  const validation = libraryBookSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const book = await db.query.libraryBooks.findFirst({ where: and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)) });
    if (!book) throw new Error("Livre non trouvé");

    const diff = validation.data.totalQuantity - book.totalQuantity;
    
    await db.update(libraryBooks)
      .set({
        ...validation.data,
        schoolId,
        availableQuantity: book.availableQuantity + diff,
      })
      .where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function deleteLibraryBook(id: number) {
  return protectedDbAction("Library", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await db.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

// --- Issues ---
export async function getLibraryIssues() {
  return protectedDbAction("Library", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.libraryIssues.findMany({
      where: eq(libraryIssues.schoolId, schoolId),
      with: {
        book: true,
        student: true,
        employee: true,
      },
      orderBy: [desc(libraryIssues.issueDate)],
    });
    return { data };
  });
}

export async function issueLibraryBook(formData: LibraryIssueFormData) {
  const validation = libraryIssueSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    // 1. Check availability
    const book = await db.query.libraryBooks.findFirst({
      where: and(eq(libraryBooks.id, validation.data.bookId), eq(libraryBooks.schoolId, schoolId)),
    });

    if (!book || book.availableQuantity <= 0) {
      throw new Error("Livre non disponible pour le moment.");
    }

    // 2. Create issue
    await db.insert(libraryIssues).values({
      ...validation.data,
      schoolId,
      dueDate: new Date(validation.data.dueDate),
      status: "En cours",
    });

    // 3. Update availability
    await db.update(libraryBooks)
      .set({ availableQuantity: book.availableQuantity - 1 })
      .where(and(eq(libraryBooks.id, validation.data.bookId), eq(libraryBooks.schoolId, schoolId)));

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function returnLibraryBook(issueId: number, fineAmount: number = 0) {
  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const issue = await db.query.libraryIssues.findFirst({
      where: and(eq(libraryIssues.id, issueId), eq(libraryIssues.schoolId, schoolId)),
    });

    if (!issue || issue.status === "Retourné") {
      throw new Error("Emprunt non trouvé ou déjà retourné.");
    }

    // 1. Update issue
    await db.update(libraryIssues)
      .set({
        status: "Retourné",
        returnDate: new Date(),
        fineAmount: fineAmount.toString(),
      })
      .where(and(eq(libraryIssues.id, issueId), eq(libraryIssues.schoolId, schoolId)));

    // 2. Update book availability
    const book = await db.query.libraryBooks.findFirst({
      where: and(eq(libraryBooks.id, issue.bookId!), eq(libraryBooks.schoolId, schoolId)),
    });

    if (book) {
      await db.update(libraryBooks)
        .set({ availableQuantity: book.availableQuantity + 1 })
        .where(and(eq(libraryBooks.id, book.id), eq(libraryBooks.schoolId, schoolId)));
    }

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}
