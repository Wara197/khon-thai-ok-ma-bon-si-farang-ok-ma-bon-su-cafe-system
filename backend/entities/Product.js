/** คำสั่งอ่านและเขียนเมนูสินค้า รวมถึงคำแนะนำวิธีชงที่บันทึกกับสินค้า */
const db = require("../db");

// <<entity>> Product — ติดต่อฐานข้อมูลตาราง products, categories, product_options
// ไม่มี Business Logic ในชั้นนี้ มีแค่ CRUD operations
class Product {
  /**
   * ดึงเมนูทั้งหมดที่เปิดขาย (is_active = 1) พร้อมชื่อหมวดหมู่
   * อ้างอิง: FR-01
   */
  static async findAllActive() {
    return db.all(`
      SELECT p.id, p.category_id, c.name AS category_name,
             p.name, p.base_price, p.image_url, p.preparation_instructions
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY c.sort_order, p.id
    `);
  }

  /**
   * ดึงเมนูตาม ID
   */
  static async findById(id) {
    return db.get("SELECT * FROM products WHERE id = ? AND is_active = 1", [id]);
  }

  /**
   * เพิ่มเมนูใหม่ (สำหรับเจ้าของร้าน - Use Case 07, FR-04)
   */
  static async create({ categoryId, name, basePrice, imageUrl, preparationInstructions }) {
    const result = await db.run(
      `INSERT INTO products (category_id, name, base_price, image_url, preparation_instructions, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [categoryId, name, basePrice, imageUrl || null, preparationInstructions || ""]
    );
    return { id: result.lastID, categoryId, name, basePrice, imageUrl, preparationInstructions: preparationInstructions || "" };
  }

  /**
   * แก้ไขเมนูและราคา (สำหรับเจ้าของร้าน - Use Case 07, FR-04)
   */
  static async update(id, { categoryId, name, basePrice, imageUrl, preparationInstructions }) {
    await db.run(
      `UPDATE products 
       SET category_id = ?, name = ?, base_price = ?, image_url = ?, preparation_instructions = ?
       WHERE id = ?`,
      [categoryId, name, basePrice, imageUrl, preparationInstructions || "", id]
    );
    return { id, categoryId, name, basePrice, imageUrl, preparationInstructions: preparationInstructions || "" };
  }

  /**
   * ลบเมนู (Soft Delete ป้องกัน Foreign Key ใน order_items เสียหาย)
   */
  static async delete(id) {
    return db.run("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
  }
}

module.exports = Product;
