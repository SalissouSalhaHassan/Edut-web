"use server";

import { db } from "@/infrastructure/database";
import { canteenItems, studentWallets, canteenTransactions, canteenInvoices } from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { schoolBranches, settings } from "@/infrastructure/database/schema/settings";
import { schools } from "@/infrastructure/database/schema/auth";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getActiveSchoolProfile() {
  return protectedDbAction("Canteen", "canView", async () => {
    try {
      const schoolId = await getActiveSchoolId();

      const branch = await db.query.schoolBranches.findFirst({
        where: eq(schoolBranches.schoolId, schoolId),
      }).catch(() => null);

      if (branch && branch.branchName) {
        return { data: { schoolName: branch.branchName } };
      }

      const school = await db.query.schools.findFirst({
        where: eq(schools.id, schoolId),
      }).catch(() => null);

      if (school && school.name) {
        return { data: { schoolName: school.name } };
      }

      const nameSetting = await db.query.settings.findFirst({
        where: and(eq(settings.key, "school_name"), eq(settings.schoolId, schoolId))
      }).catch(() => null);

      if (nameSetting?.value) {
        return { data: { schoolName: nameSetting.value } };
      }
    } catch (e) {
      console.error("School profile fetch error:", e);
    }
    return { data: { schoolName: "Établissement Scolaire" } };
  });
}

// Helper to ensure tables exist in PostgreSQL database
async function ensureCanteenTablesExist() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS canteen_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50),
        price DOUBLE PRECISION NOT NULL,
        category VARCHAR(50) DEFAULT 'Général',
        stock INTEGER DEFAULT 100,
        image_url TEXT,
        school_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});

    await db.execute(sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS code VARCHAR(50);`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS image_url TEXT;`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS school_id INTEGER;`).catch(() => {});

    await db.execute(sql`ALTER TABLE canteen_items ALTER COLUMN school_id DROP NOT NULL;`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_items ALTER COLUMN category DROP NOT NULL;`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_items ALTER COLUMN stock DROP NOT NULL;`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_items ALTER COLUMN code DROP NOT NULL;`).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS canteen_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        client_name VARCHAR(150) DEFAULT 'CLIENT COMPTANT',
        student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        subtotal DOUBLE PRECISION NOT NULL,
        tva DOUBLE PRECISION DEFAULT 0,
        total_ttc DOUBLE PRECISION NOT NULL,
        amount_received DOUBLE PRECISION DEFAULT 0,
        change_given DOUBLE PRECISION DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        status VARCHAR(50) DEFAULT 'Payée',
        items_json TEXT,
        cashier_name VARCHAR(100) DEFAULT 'admin',
        school_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});

    await db.execute(sql`ALTER TABLE canteen_invoices ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(100) DEFAULT 'admin';`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_invoices ADD COLUMN IF NOT EXISTS school_id INTEGER;`).catch(() => {});
    await db.execute(sql`ALTER TABLE canteen_invoices ALTER COLUMN school_id DROP NOT NULL;`).catch(() => {});
  } catch (err) {
    console.error("Canteen table auto-creation info:", err);
  }
}

// ─── Articles / Products CRUD ──────────────────────────────────────────────────
export async function getCanteenItems() {
  return protectedDbAction("Canteen", "canView", async () => {
    await ensureCanteenTablesExist();
    let data = await db.query.canteenItems.findMany({
      orderBy: [desc(canteenItems.id)]
    }).catch(() => []);

    // Seed database automatically if empty so POS operates 100% on real DB rows
    if (!data || data.length === 0) {
      const seedItems = [
        { name: "BOITE ARDOISE INF", code: "ART-01", price: 1000, category: "Fournitures", stock: 50 },
        { name: "BOITE COL FORMIKA", code: "ART-02", price: 500, category: "Fournitures", stock: 30 },
        { name: "BOITE COLORANT", code: "ART-03", price: 1000, category: "Fournitures", stock: 25 },
        { name: "BOITE DE CANOPY", code: "ART-04", price: 500, category: "Snacks", stock: 40 },
        { name: "BOITE DE TRAP EAU", code: "ART-05", price: 1200, category: "Snacks", stock: 15 },
        { name: "BOITE DE VERNIS SAVANA", code: "ART-06", price: 1500, category: "Snacks", stock: 20 },
        { name: "JUICE TOP BOND 1/2L", code: "BEV-01", price: 250, category: "Boissons", stock: 60 },
        { name: "EAU MINERALE 1.5L", code: "BEV-02", price: 300, category: "Boissons", stock: 100 },
        { name: "SANDWICH CHICKEN", code: "MEAL-01", price: 1500, category: "Repas", stock: 15 },
      ];
      for (const item of seedItems) {
        await db.insert(canteenItems).values(item).catch(() => {});
      }
      data = await db.query.canteenItems.findMany({
        orderBy: [desc(canteenItems.id)]
      }).catch(() => []);
    }

    return { data: data || [] };
  });
}

export async function createCanteenItem(data: {
  name: string;
  code?: string;
  price: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async (user: any) => {
    await ensureCanteenTablesExist();
    
    const cleanName = data.name.trim();
    const cleanCode = (data.code && data.code.trim().length > 0) ? data.code.trim() : null;
    const cleanPrice = Number(data.price) || 0;
    const cleanCategory = data.category || "Snacks";
    const cleanStock = Number(data.stock) ?? 100;
    const cleanImage = (data.imageUrl && data.imageUrl.trim().length > 0) ? data.imageUrl.trim() : null;
    const schoolId = user?.schoolId || null;

    // Reset sequence safely
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('canteen_items', 'id'), 
        GREATEST((SELECT COALESCE(MAX(id), 0) FROM canteen_items) + 1, 1000), 
        false
      );
    `).catch(() => {});

    // Try multi-level insert
    try {
      const res = await db.execute(sql`
        INSERT INTO canteen_items (name, code, price, category, stock, image_url, school_id)
        VALUES (${cleanName}, ${cleanCode}, ${cleanPrice}, ${cleanCategory}, ${cleanStock}, ${cleanImage}, ${schoolId})
        RETURNING *;
      `) as any;
      const resRows = Array.isArray(res) ? res : (res as any)?.rows || [];
      const newItem = resRows[0] || { name: cleanName, code: cleanCode, price: cleanPrice, category: cleanCategory, stock: cleanStock };

      revalidatePath("/dashboard/canteen");
      revalidatePath("/dashboard/pos");
      return { success: true, data: newItem };
    } catch (e1: any) {
      console.error("Insert attempt 1 failed:", e1?.message || e1);

      try {
        const res = await db.execute(sql`
          INSERT INTO canteen_items (name, code, price, category, stock, image_url)
          VALUES (${cleanName}, ${cleanCode}, ${cleanPrice}, ${cleanCategory}, ${cleanStock}, ${cleanImage})
          RETURNING *;
        `) as any;
        const resRows = Array.isArray(res) ? res : (res as any)?.rows || [];
        const newItem = resRows[0] || { name: cleanName, code: cleanCode, price: cleanPrice, category: cleanCategory, stock: cleanStock };

        revalidatePath("/dashboard/canteen");
        revalidatePath("/dashboard/pos");
        return { success: true, data: newItem };
      } catch (e2: any) {
        console.error("Insert attempt 2 failed:", e2?.message || e2);

        try {
          const res = await db.execute(sql`
            INSERT INTO canteen_items (name, price)
            VALUES (${cleanName}, ${cleanPrice})
            RETURNING *;
          `) as any;
          const resRows = Array.isArray(res) ? res : (res as any)?.rows || [];
          const newItem = resRows[0] || { name: cleanName, price: cleanPrice, category: cleanCategory, stock: cleanStock };

          revalidatePath("/dashboard/canteen");
          revalidatePath("/dashboard/pos");
          return { success: true, data: newItem };
        } catch (e3: any) {
          console.error("Insert attempt 3 failed:", e3?.message || e3);
          return { success: false, error: e3?.message || "Erreur d'insertion dans la base de données" };
        }
      }
    }
  });
}

export async function updateCanteenItem(id: number, data: {
  name: string;
  code?: string;
  price: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await ensureCanteenTablesExist();
    try {
      await db.update(canteenItems)
        .set({
          name: data.name,
          code: data.code || null,
          price: Number(data.price) || 0,
          category: data.category || "Snacks",
          stock: Number(data.stock) ?? 100,
          imageUrl: data.imageUrl || null,
        })
        .where(eq(canteenItems.id, id));
    } catch (e) {
      await db.execute(sql`
        UPDATE canteen_items 
        SET name = ${data.name}, code = ${data.code || null}, price = ${Number(data.price) || 0}, category = ${data.category || 'Snacks'}, stock = ${Number(data.stock) ?? 100}
        WHERE id = ${id};
      `);
    }

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

export async function deleteCanteenItem(id: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.delete(canteenItems).where(eq(canteenItems.id, id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

// ─── Invoices / Factures CRUD ──────────────────────────────────────────────────
export async function getCanteenInvoices() {
  return protectedDbAction("Canteen", "canView", async () => {
    await ensureCanteenTablesExist();
    const data = await db.query.canteenInvoices.findMany({
      orderBy: [desc(canteenInvoices.id)],
      limit: 100,
    }).catch(() => []);
    return { data: data || [] };
  });
}

export async function createCanteenInvoice(data: {
  clientName?: string;
  studentId?: number;
  subtotal: number;
  tva?: number;
  totalTtc: number;
  amountReceived?: number;
  changeGiven?: number;
  paymentMethod?: string;
  itemsJson: string;
  cashierName?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await ensureCanteenTablesExist();

    const validStudentId = data.studentId && !isNaN(Number(data.studentId)) && Number(data.studentId) > 0 ? Number(data.studentId) : null;
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const [newInvoice] = await db.insert(canteenInvoices).values({
      invoiceNumber,
      clientName: data.clientName || "CLIENT COMPTANT",
      studentId: validStudentId,
      subtotal: Number(data.subtotal) || 0,
      tva: Number(data.tva) || 0,
      totalTtc: Number(data.totalTtc) || 0,
      amountReceived: Number(data.amountReceived) || 0,
      changeGiven: Number(data.changeGiven) || 0,
      paymentMethod: data.paymentMethod || "Cash",
      itemsJson: data.itemsJson,
      cashierName: data.cashierName || "admin",
      status: "Payée",
    }).returning();

    // Deduct stock for items if possible
    try {
      const itemsList = JSON.parse(data.itemsJson || "[]");
      for (const item of itemsList) {
        if (item.id) {
          const currentItem = await db.query.canteenItems.findFirst({
            where: eq(canteenItems.id, item.id)
          });
          if (currentItem && typeof currentItem.stock === 'number') {
            const newStock = Math.max(0, currentItem.stock - (item.quantity || 1));
            await db.update(canteenItems).set({ stock: newStock }).where(eq(canteenItems.id, item.id));
          }
        }
      }
    } catch (e) {
      console.error("Stock update error:", e);
    }

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, data: newInvoice };
  });
}

export async function voidCanteenInvoice(id: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.update(canteenInvoices)
      .set({ status: "Annulée" })
      .where(eq(canteenInvoices.id, id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

// ─── Students for Client Selector ─────────────────────────────────────────────
export async function getCanteenStudents() {
  return protectedDbAction("Canteen", "canView", async () => {
    const data = await db.query.students.findMany({
      limit: 100,
      columns: {
        id: true,
        nomEtudiant: true,
        numAdmission: true,
        classe: true,
      }
    });
    return { data };
  });
}

// ─── Student Wallet Actions ───────────────────────────────────────────────────
export async function getStudentWallet(studentId: number) {
  return protectedDbAction("Canteen", "canView", async () => {
    let wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, studentId)
    });
    
    if (!wallet) {
      const [newWallet] = await db.insert(studentWallets).values({ studentId, balance: 0 }).returning();
      wallet = newWallet;
    }
    
    return { data: wallet };
  });
}

export async function rechargeWallet(studentId: number, amount: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    let wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, studentId)
    });
    
    if (!wallet) {
      const [newWallet] = await db.insert(studentWallets).values({ studentId, balance: 0 }).returning();
      wallet = newWallet;
    }
    
    if (!wallet) return { error: "Portefeuille introuvable" };

    const newBalance = (wallet.balance || 0) + amount;
    await db.update(studentWallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(studentWallets.id, wallet.id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, balance: newBalance };
  });
}
