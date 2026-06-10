"use server";

import { db } from "@/infrastructure/database";
import { libraryBooks, libraryIssues } from "@/infrastructure/database/schema/library";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { libraryBookSchema, libraryIssueSchema, LibraryBookFormData, LibraryIssueFormData } from "../validators/library.schema";
import { protectedDbAction } from "@/lib/protected-action";

// --- Books ---
export async function getLibraryBooks() {
  return protectedDbAction("Library", "canView", async () => {
    const data = await db.query.libraryBooks.findMany({
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
    await db.insert(libraryBooks).values({
      ...validation.data,
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
    const book = await db.query.libraryBooks.findFirst({ where: eq(libraryBooks.id, id) });
    if (!book) throw new Error("Livre non trouvé");

    const diff = validation.data.totalQuantity - book.totalQuantity;
    
    await db.update(libraryBooks)
      .set({
        ...validation.data,
        availableQuantity: book.availableQuantity + diff,
      })
      .where(eq(libraryBooks.id, id));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function deleteLibraryBook(id: number) {
  return protectedDbAction("Library", "canDelete", async () => {
    await db.delete(libraryBooks).where(eq(libraryBooks.id, id));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

// --- Issues ---
export async function getLibraryIssues() {
  return protectedDbAction("Library", "canView", async () => {
    const data = await db.query.libraryIssues.findMany({
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
    // 1. Check availability
    const book = await db.query.libraryBooks.findFirst({
      where: eq(libraryBooks.id, validation.data.bookId),
    });

    if (!book || book.availableQuantity <= 0) {
      throw new Error("Livre non disponible pour le moment.");
    }

    // 2. Create issue
    await db.insert(libraryIssues).values({
      ...validation.data,
      dueDate: new Date(validation.data.dueDate),
      status: "En cours",
    });

    // 3. Update availability
    await db.update(libraryBooks)
      .set({ availableQuantity: book.availableQuantity - 1 })
      .where(eq(libraryBooks.id, validation.data.bookId));

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function returnLibraryBook(issueId: number, fineAmount: number = 0) {
  return protectedDbAction("Library", "canEdit", async () => {
    const issue = await db.query.libraryIssues.findFirst({
      where: eq(libraryIssues.id, issueId),
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
      .where(eq(libraryIssues.id, issueId));

    // 2. Update book availability
    const book = await db.query.libraryBooks.findFirst({
      where: eq(libraryBooks.id, issue.bookId!),
    });

    if (book) {
      await db.update(libraryBooks)
        .set({ availableQuantity: book.availableQuantity + 1 })
        .where(eq(libraryBooks.id, book.id));
    }

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}
