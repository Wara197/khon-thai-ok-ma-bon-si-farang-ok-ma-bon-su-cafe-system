/** อ่านและบันทึกยอดวัตถุดิบ สูตรการใช้ และประวัติ stock movement */
const db = require("../db");

// <<entity>> Inventory — stock และสูตรการใช้วัตถุดิบของสินค้า
class Inventory {
  // เพิ่มวัตถุดิบและบันทึกยอดตั้งต้นใน transaction เดียวกัน
  static create({ name, stockQty, minThreshold, unit, branchId = 1 }) {
    // เก็บชื่อวัตถุดิบเป็นข้อมูลกลาง แต่สร้างยอดแยกสาขาในธุรกรรมเดียวกัน
    return db.transaction(async (connection) => {
      const result = await connection.run(
        "INSERT INTO inventory (name, stock_qty, min_threshold, unit) VALUES (?, 0, 0, ?)",
        [name, unit],
      );
      const branches = await connection.all("SELECT id FROM branches");
      for (const branch of branches) {
        await connection.run(
          "INSERT INTO inventory_stock (branch_id, inventory_id, stock_qty, min_threshold) VALUES (?, ?, ?, ?)",
          [branch.id, result.lastID, branch.id === Number(branchId) ? stockQty : 0, minThreshold],
        );
      }
      if (stockQty > 0) {
        await connection.run(
          "INSERT INTO inventory_movements (branch_id, inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?, ?)",
          [branchId, result.lastID, stockQty, "initial_stock", "inventory"],
        );
      }
      return result;
    });
  }

  // คืนวัตถุดิบทุกชนิดพร้อมยอดรวมการใช้สูตรเพื่อแสดงในหน้าของ owner
  static findAll(branchId = 1) {
    return db.all(`
      SELECT i.id, i.name, i.unit,
             COALESCE(s.stock_qty, 0) AS stock_qty,
             COALESCE(s.min_threshold, 0) AS min_threshold,
             COALESCE(SUM(pr.quantity_per_unit), 0) AS recipe_usage
      FROM inventory i
      LEFT JOIN inventory_stock s ON s.inventory_id = i.id AND s.branch_id = ?
      LEFT JOIN product_recipe_rules pr ON pr.inventory_id = i.id
      GROUP BY i.id, s.stock_qty, s.min_threshold
      -- เรียงตามชื่อคงที่ เพื่อไม่ให้แถวขยับตำแหน่งเมื่อยอดเปลี่ยนผ่านเกณฑ์แจ้งเตือน
      ORDER BY i.name COLLATE NOCASE ASC, i.id ASC
    `, [branchId]);
  }

  // Projection สำหรับ role ที่ดูสต็อกได้อย่างเดียว ไม่รวมข้อมูลสูตรหรือปริมาณการใช้
  // ให้ role ที่อ่านได้อย่างเดียวเห็น stock แต่ไม่ส่งข้อมูลสูตรหรือ movement
  static findStockOverview(branchId = 1) {
    if (branchId === "all") {
      return db.all(`
        SELECT i.id, i.name, COALESCE(s.stock_qty, 0) AS stock_qty,
               COALESCE(s.min_threshold, 0) AS min_threshold, i.unit,
               b.id AS branch_id, b.name AS branch_name
        FROM branches b CROSS JOIN inventory i
        LEFT JOIN inventory_stock s ON s.inventory_id = i.id AND s.branch_id = b.id
        ORDER BY b.id, (COALESCE(s.stock_qty, 0) <= COALESCE(s.min_threshold, 0)) DESC, i.name ASC
      `);
    }
    return db.all(`
      SELECT i.id, i.name, COALESCE(s.stock_qty, 0) AS stock_qty,
             COALESCE(s.min_threshold, 0) AS min_threshold, i.unit,
             b.id AS branch_id, b.name AS branch_name
      FROM branches b CROSS JOIN inventory i
      LEFT JOIN inventory_stock s ON s.inventory_id = i.id AND s.branch_id = b.id
      WHERE b.id = ?
      ORDER BY (COALESCE(s.stock_qty, 0) <= COALESCE(s.min_threshold, 0)) DESC, i.name ASC
    `, [branchId]);
  }

  // ใช้คัดวัตถุดิบที่ถึงหรือต่ำกว่าจุดแจ้งเตือน
  static findLowStock(branchId = 1) {
    return db.all(`SELECT i.id, i.name, i.unit, s.stock_qty, s.min_threshold
      FROM inventory_stock s JOIN inventory i ON i.id = s.inventory_id
      WHERE s.branch_id = ? AND s.stock_qty <= s.min_threshold ORDER BY s.stock_qty ASC, i.name ASC`, [branchId]);
  }

  // รวมกฎสูตรของเมนูที่กำลังสั่ง เพื่อให้ controller ตรวจและตัด stock ใน transaction
  static findRequirements(items, branchId = 1, connection = db) {
    // ดึงกฎสูตรของเมนูในออเดอร์เป็นชุดเดียว; รับ connection จาก transaction ได้
    const ids = items.map((item) => item.productId);
    if (!ids.length) return Promise.resolve([]);
    const placeholders = ids.map(() => "?").join(",");
    return connection.all(`
      SELECT pr.product_id, pr.inventory_id, pr.option_type, pr.option_id, pr.quantity_per_unit,
             i.name, s.stock_qty, s.min_threshold, i.unit
      FROM product_recipe_rules pr
      JOIN inventory i ON i.id = pr.inventory_id
      JOIN inventory_stock s ON s.inventory_id = i.id AND s.branch_id = ?
      WHERE pr.product_id IN (${placeholders})
    `, [branchId, ...ids]);
  }

  // ปรับยอดคงเหลือและ threshold; controller เป็นผู้บันทึกเหตุผลการเปลี่ยนแปลง
  static updateStock(id, stockQty, minThreshold, branchId = 1) {
    return db.run(
      "UPDATE inventory_stock SET stock_qty = ?, min_threshold = ? WHERE inventory_id = ? AND branch_id = ?",
      [stockQty, minThreshold, id, branchId],
    );
  }

  // คืนประวัติรับเข้า ตัด หรือคืนสต็อกล่าสุดพร้อมชื่อวัตถุดิบและหน่วย
  static getMovements(limit = 30, branchId = 1) {
    return db.all(`
      SELECT m.*, i.name AS inventory_name, i.unit
      FROM inventory_movements m
      JOIN inventory i ON i.id = m.inventory_id
      WHERE m.branch_id = ?
      ORDER BY m.id DESC LIMIT ?
    `, [branchId, limit]);
  }

  // ดึงสูตรทั้งหมดพร้อมชื่อเมนู วัตถุดิบ และชื่อ option สำหรับหน้า owner
  static getRecipes() {
    return db.all(`
      SELECT pr.product_id, p.name AS product_name, pr.inventory_id,
             i.name AS inventory_name, i.unit, pr.option_type, pr.option_id,
             po.name AS option_name, pr.quantity_per_unit
      FROM product_recipe_rules pr
      JOIN products p ON p.id = pr.product_id
      JOIN inventory i ON i.id = pr.inventory_id
      LEFT JOIN product_options po ON po.id = pr.option_id AND pr.option_type != 'base'
      ORDER BY p.name, i.name
    `);
  }

  // เพิ่มหรือแก้ปริมาณสูตรของเมนูตามวัตถุดิบและชนิดตัวเลือก
  static setRecipe(productId, inventoryId, optionType, optionId, quantityPerUnit) {
    // ถ้าคู่เมนู/วัตถุดิบ/ตัวเลือกมีอยู่แล้ว ให้อัปเดตปริมาณแทนการสร้างแถวซ้ำ
    return db.run(`
      INSERT INTO product_recipe_rules (product_id, inventory_id, option_type, option_id, quantity_per_unit)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(product_id, inventory_id, option_type, option_id) DO UPDATE SET quantity_per_unit = excluded.quantity_per_unit
    `, [productId, inventoryId, optionType, optionId, quantityPerUnit]);
  }

  // ลบกฎสูตรหนึ่งรายการตามคีย์เมนู/วัตถุดิบ/ตัวเลือก
  static deleteRecipe(productId, inventoryId, optionType, optionId) {
    return db.run("DELETE FROM product_recipe_rules WHERE product_id = ? AND inventory_id = ? AND option_type = ? AND option_id = ?", [productId, inventoryId, optionType, optionId]);
  }

  // เพิ่มยอดรับเข้าและประวัติ movement แบบ atomic
  static receiveStock(id, quantity, note, branchId = 1) {
    // เพิ่มยอดและบันทึกเหตุการณ์รับเข้าแบบ atomic เพื่อไม่ให้ยอดกับ movement แยกจากกัน
    return db.transaction(async (connection) => {
      const item = await connection.get("SELECT inventory_id FROM inventory_stock WHERE inventory_id = ? AND branch_id = ?", [id, branchId]);
      if (!item) return false;
      await connection.run("UPDATE inventory_stock SET stock_qty = stock_qty + ? WHERE inventory_id = ? AND branch_id = ?", [quantity, id, branchId]);
      await connection.run("INSERT INTO inventory_movements (branch_id, inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?, ?)", [branchId, id, quantity, note ? `stock_received: ${note}` : "stock_received", "inventory"]);
      return true;
    });
  }
}

module.exports = Inventory;
