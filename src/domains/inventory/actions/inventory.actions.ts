"use server";

import { db } from "@/infrastructure/database";
import { inventoryItems, inventoryAssignments, inventoryCategories } from "@/infrastructure/database/schema/inventory";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

async function ensureInventoryTablesExist() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        category_id INTEGER,
        quantity INTEGER DEFAULT 0,
        unit_price DOUBLE PRECISION DEFAULT 0,
        condition VARCHAR(50) DEFAULT 'Neuf',
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_assignments (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        employee_id INTEGER,
        assigned_qty INTEGER NOT NULL,
        assigned_date TIMESTAMP DEFAULT NOW(),
        return_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'En possession'
      );
    `).catch(() => {});

    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS school_id INTEGER;`).catch(() => {});
    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_price DOUBLE PRECISION DEFAULT 0;`).catch(() => {});
    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'Neuf';`).catch(() => {});
    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location VARCHAR(255);`).catch(() => {});
  } catch (err) {
    console.error("Inventory table auto-creation info:", err);
  }
}

export async function getInventoryItems() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryTablesExist();

    let data: any[] = [];
    try {
      data = await db.query.inventoryItems.findMany({
        with: { category: true },
        orderBy: [desc(inventoryItems.id)]
      });
    } catch (e) {
      const rawRes = await db.execute(sql`SELECT * FROM inventory_items ORDER BY id DESC`).catch(() => []);
      data = Array.isArray(rawRes) ? rawRes : (rawRes as any)?.rows || [];
    }

    if (!data || data.length === 0) {
      const defaultItems = [
        { name: "Ordinateur Portable HP ProBook", sku: "EQUIP-001", quantity: 15, unitPrice: 350000, condition: "Neuf", location: "Salle Informatique 1" },
        { name: "Vidéoprojecteur Epson Full HD", sku: "EQUIP-002", quantity: 5, unitPrice: 250000, condition: "Bon état", location: "Salle Polyvalente" },
        { name: "Chaise Ergonomique de Bureau", sku: "MOB-001", quantity: 25, unitPrice: 45000, condition: "Neuf", location: "Bureaux Administratifs" },
        { name: "Tableau Blanc Magnétique 200x120", sku: "MOB-002", quantity: 12, unitPrice: 65000, condition: "Neuf", location: "Salles de Classe" },
        { name: "Imprimante Multifonction Canon", sku: "EQUIP-003", quantity: 3, unitPrice: 180000, condition: "Bon état", location: "Secrétariat Principal" },
      ];
      for (const item of defaultItems) {
        await db.execute(sql`
          INSERT INTO inventory_items (name, sku, quantity, unit_price, condition, location)
          VALUES (${item.name}, ${item.sku}, ${item.quantity}, ${item.unitPrice}, ${item.condition}, ${item.location})
        `).catch(() => {});
      }
      try {
        const rawRes = await db.execute(sql`SELECT * FROM inventory_items ORDER BY id DESC`) as any;
        data = Array.isArray(rawRes) ? rawRes : (rawRes as any)?.rows || [];
      } catch (e) {
        data = [];
      }
    }

    return { data: data || [] };
  });
}

export async function getInventoryCategories() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryTablesExist();
    const data = await db.query.inventoryCategories.findMany().catch(() => []);
    return { data: data || [] };
  });
}

export async function saveInventoryItem(data: {
  name: string;
  sku?: string | null;
  categoryId?: number | null;
  quantity?: number | null;
  unitPrice?: number | null;
  condition?: string | null;
  location?: string | null;
}, id?: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryTablesExist();
    const schoolId = await getActiveSchoolId().catch(() => null);

    const cleanName = data.name.trim();
    const cleanSku = data.sku ? data.sku.trim().toUpperCase() : `SKU-${Math.floor(100 + Math.random() * 900)}`;
    const cleanQty = Number(data.quantity) || 0;
    const cleanUnitPrice = Number(data.unitPrice) || 0;
    const cleanCondition = data.condition || "Neuf";
    const cleanLocation = data.location ? data.location.trim() : "Stock Principal";
    const cleanCategoryId = data.categoryId ? Number(data.categoryId) : null;

    if (id && id > 0) {
      await db.execute(sql`
        UPDATE inventory_items
        SET name = ${cleanName}, sku = ${cleanSku}, quantity = ${cleanQty}, 
            unit_price = ${cleanUnitPrice}, condition = ${cleanCondition}, location = ${cleanLocation}, category_id = ${cleanCategoryId}
        WHERE id = ${id};
      `).catch(() => {});
    } else {
      await db.execute(sql`
        INSERT INTO inventory_items (school_id, name, sku, quantity, unit_price, condition, location, category_id)
        VALUES (${schoolId}, ${cleanName}, ${cleanSku}, ${cleanQty}, ${cleanUnitPrice}, ${cleanCondition}, ${cleanLocation}, ${cleanCategoryId});
      `).catch(() => {});
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function getInventoryAssignments() {
  return protectedDbAction("Inventory", "canView", async () => {
    await ensureInventoryTablesExist();
    let data: any[] = [];
    try {
      data = await db.query.inventoryAssignments.findMany({
        with: {
          item: true,
          employee: true
        },
        orderBy: [desc(inventoryAssignments.id)]
      });
    } catch (e) {
      const rawRes = await db.execute(sql`
        SELECT a.*, i.name as item_name, e.nom as employee_nom, e.prenom as employee_prenom
        FROM inventory_assignments a
        LEFT JOIN inventory_items i ON a.item_id = i.id
        LEFT JOIN employees e ON a.employee_id = e.id
        ORDER BY a.id DESC;
      `).catch(() => []);
      data = Array.isArray(rawRes) ? rawRes : (rawRes as any)?.rows || [];
    }
    return { data: data || [] };
  });
}

export async function getInventoryEmployees() {
  return protectedDbAction("Inventory", "canView", async () => {
    try {
      const data = await db.execute(sql`SELECT id, nom, prenom, role FROM employees ORDER BY id DESC`) as any;
      const rows = Array.isArray(data) ? data : (data as any)?.rows || [];
      return { data: rows };
    } catch (e) {
      return { data: [] };
    }
  });
}

export async function assignItem(data: { itemId: number; employeeId?: number; employeeName?: string; assignedQty: number }) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryTablesExist();
    const schoolId = await getActiveSchoolId().catch(() => null);

    const qtyToAssign = Number(data.assignedQty) || 1;

    // 1. Check stock
    const itemRes = await db.execute(sql`SELECT * FROM inventory_items WHERE id = ${data.itemId}`).catch(() => null) as any;
    const itemRows = Array.isArray(itemRes) ? itemRes : (itemRes as any)?.rows || [];
    const item = itemRows[0];

    if (!item || (item.quantity || 0) < qtyToAssign) {
      return { success: false, error: "Stock insuffisant pour cette affectation." };
    }

    // 2. Create assignment
    await db.execute(sql`
      INSERT INTO inventory_assignments (school_id, item_id, employee_id, assigned_qty, status)
      VALUES (${schoolId}, ${data.itemId}, ${data.employeeId || null}, ${qtyToAssign}, 'En possession');
    `).catch(() => {});

    // 3. Decrement stock
    await db.execute(sql`
      UPDATE inventory_items
      SET quantity = GREATEST(0, COALESCE(quantity, 0) - ${qtyToAssign})
      WHERE id = ${data.itemId};
    `).catch(() => {});

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function returnItem(assignmentId: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    await ensureInventoryTablesExist();

    const assignRes = await db.execute(sql`SELECT * FROM inventory_assignments WHERE id = ${assignmentId}`).catch(() => null) as any;
    const assignRows = Array.isArray(assignRes) ? assignRes : (assignRes as any)?.rows || [];
    const assign = assignRows[0];

    if (!assign || assign.status === "Retourné") {
      return { success: false, error: "Cet article est déjà restitué." };
    }

    // 1. Mark as returned
    await db.execute(sql`
      UPDATE inventory_assignments
      SET status = 'Retourné', return_date = NOW()
      WHERE id = ${assignmentId};
    `).catch(() => {});

    // 2. Add back to stock
    if (assign.item_id) {
      await db.execute(sql`
        UPDATE inventory_items
        SET quantity = COALESCE(quantity, 0) + ${assign.assigned_qty || 1}
        WHERE id = ${assign.item_id};
      `).catch(() => {});
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function deleteInventoryItem(id: number) {
  return protectedDbAction("Inventory", "canDelete", async () => {
    await ensureInventoryTablesExist();
    await db.execute(sql`DELETE FROM inventory_items WHERE id = ${id};`).catch(() => {});
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}
