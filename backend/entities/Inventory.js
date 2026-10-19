const db = require("../db");

// <<entity>> Inventory — stock และสูตรการใช้วัตถุดิบของสินค้า
class Inventory {
  static create({ name, stockQty, minThreshold, unit }) {
    // เก็บรายการวัตถุดิบและยอดตั้งต้นเป็นธุรกรรมเดียว เพื่อให้มีประวัติเริ่มต้นครบถ้วน
    return db.transaction(async (connection) => {
      const result = await connection.run(
        "INSERT INTO inventory (name, stock_qty, min_threshold, unit) VALUES (?, ?, ?, ?)",
        [name, stockQty, minThreshold, unit],
      );
      if (stockQty > 0) {
        await connection.run(
          "INSERT INTO inventory_movements (inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?)",
          [result.lastID, stockQty, "initial_stock", "inventory"],
        );
      }
      return result;
    });
  }

  static findAll() {
    return db.all(`
      SELECT i.*, COALESCE(SUM(pr.quantity_per_unit), 0) AS recipe_usage
      FROM inventory i
      LEFT JOIN product_recipe_rules pr ON pr.inventory_id = i.id
      GROUP BY i.id
      ORDER BY (i.stock_qty <= i.min_threshold) DESC, i.name ASC
    `);
  }

  // Projection สำหรับ role ที่ดูสต็อกได้อย่างเดียว ไม่รวมข้อมูลสูตรหรือปริมาณการใช้
  static findStockOverview() {
    return db.all(`
      SELECT id, name, stock_qty, min_threshold, unit
      FROM inventory
      ORDER BY (stock_qty <= min_threshold) DESC, name ASC
    `);
  }

  static findLowStock() {
    return db.all("SELECT * FROM inventory WHERE stock_qty <= min_threshold ORDER BY stock_qty ASC, name ASC");
  }

  static findRequirements(items, connection = db) {
    // ดึงกฎสูตรของเมนูในออเดอร์เป็นชุดเดียว; รับ connection จาก transaction ได้
    const ids = items.map((item) => item.productId);
    if (!ids.length) return Promise.resolve([]);
    const placeholders = ids.map(() => "?").join(",");
    return connection.all(`
      SELECT pr.product_id, pr.inventory_id, pr.option_type, pr.option_id, pr.quantity_per_unit,
             i.name, i.stock_qty, i.min_threshold, i.unit
      FROM product_recipe_rules pr
      JOIN inventory i ON i.id = pr.inventory_id
      WHERE pr.product_id IN (${placeholders})
    `, ids);
  }

  static updateStock(id, stockQty, minThreshold) {
    return db.run(
      "UPDATE inventory SET stock_qty = ?, min_threshold = ? WHERE id = ?",
      [stockQty, minThreshold, id],
    );
  }

  static getMovements(limit = 30) {
    return db.all(`
      SELECT m.*, i.name AS inventory_name, i.unit
      FROM inventory_movements m
      JOIN inventory i ON i.id = m.inventory_id
      ORDER BY m.id DESC LIMIT ?
    `, [limit]);
  }

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

  static setRecipe(productId, inventoryId, optionType, optionId, quantityPerUnit) {
    // ถ้าคู่เมนู/วัตถุดิบ/ตัวเลือกมีอยู่แล้ว ให้อัปเดตปริมาณแทนการสร้างแถวซ้ำ
    return db.run(`
      INSERT INTO product_recipe_rules (product_id, inventory_id, option_type, option_id, quantity_per_unit)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(product_id, inventory_id, option_type, option_id) DO UPDATE SET quantity_per_unit = excluded.quantity_per_unit
    `, [productId, inventoryId, optionType, optionId, quantityPerUnit]);
  }

  static deleteRecipe(productId, inventoryId, optionType, optionId) {
    return db.run("DELETE FROM product_recipe_rules WHERE product_id = ? AND inventory_id = ? AND option_type = ? AND option_id = ?", [productId, inventoryId, optionType, optionId]);
  }

  static receiveStock(id, quantity, note) {
    // เพิ่มยอดและบันทึกเหตุการณ์รับเข้าแบบ atomic เพื่อไม่ให้ยอดกับ movement แยกจากกัน
    return db.transaction(async (connection) => {
      const item = await connection.get("SELECT id FROM inventory WHERE id = ?", [id]);
      if (!item) return false;
      await connection.run("UPDATE inventory SET stock_qty = stock_qty + ? WHERE id = ?", [quantity, id]);
      await connection.run("INSERT INTO inventory_movements (inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?)", [id, quantity, note ? `stock_received: ${note}` : "stock_received", "inventory"]);
      return true;
    });
  }
}

module.exports = Inventory;
