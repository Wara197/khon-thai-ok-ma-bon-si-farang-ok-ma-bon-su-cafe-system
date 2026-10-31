/** กำหนด endpoints สำหรับอ่าน/จัดการเมนูและอัปโหลดรูปสินค้า */
const express = require("express");
const fs = require("fs");
const path = require("path");
const productController = require("../controllers/productController");
const { requireRoles } = require("../auth/middleware");

// <<boundary>> ProductRoutes — รับ HTTP request แล้วส่งต่อให้ Controller
// ไม่มี Business Logic ในชั้นนี้
const router = express.Router();

// กำหนดสิทธิ์แยกตามงาน: พนักงานอ่านเมนูได้ แต่ owner เท่านั้นที่แก้ข้อมูลเมนูและอัปโหลดรูป

/**
 * POST /api/upload
 * อัปโหลดรูปภาพสินค้า (รับ base64 data URL) แล้วบันทึกลงโฟลเดอร์ uploads
 */
router.post("/upload", requireRoles("owner"), async (req, res) => {
  try {
    const data = req.body.data || req.body.image;
    if (!data) {
      return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพที่อัปโหลด" });
    }

    const matches = data.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!matches) {
      return res.status(400).json({ error: "รูปแบบไฟล์ไม่ถูกต้อง รองรับ JPG, PNG, WEBP และ GIF เท่านั้น" });
    }

    const mime = matches[1].toLowerCase();
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[mime];
    const buffer = Buffer.from(matches[2], "base64");
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    const isGif = buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
    const signatureMatches = (mime === "image/png" && isPng)
      || (mime === "image/jpeg" && isJpeg)
      || (mime === "image/webp" && isWebp)
      || (mime === "image/gif" && isGif);
    if (!signatureMatches) {
      return res.status(400).json({ error: "เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพที่ระบุ" });
    }
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 15MB" });
    }

    const filename = `menu-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

    // บันทึกลง backend/public/uploads
    const backendDir = path.join(__dirname, "../public/uploads");
    await fs.promises.mkdir(backendDir, { recursive: true });
    await fs.promises.writeFile(path.join(backendDir, filename), buffer);

    // คัดลอกลง frontend/public/uploads เพื่อรองรับ vite dev server
    try {
      const frontendDir = path.join(__dirname, "../../frontend/public/uploads");
      await fs.promises.mkdir(frontendDir, { recursive: true });
      await fs.promises.writeFile(path.join(frontendDir, filename), buffer);
    } catch (e) {
      // ignore
    }

    const publicUrl = `/uploads/${filename}`;
    res.status(200).json({ url: publicUrl, success: true });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกรูปภาพ" });
  }
});

/**
 * GET /api/products
 * ดึงเมนูทั้งหมดที่เปิดขาย จัดกลุ่มตามหมวดหมู่ พร้อมตัวเลือก
 * อ้างอิง: FR-01, FR-02
 */
router.get("/products", requireRoles("cashier", "barista", "owner"), async (req, res) => {
  try {
    const result = await productController.listProducts();
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/**
 * GET /api/categories
 * ดึงรายการหมวดหมู่ทั้งหมด
 */
router.get("/categories", requireRoles("cashier", "barista", "owner"), async (req, res) => {
  try {
    const result = await productController.listCategories();
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/**
 * POST /api/products
 * เพิ่มเมนูใหม่ (สำหรับเจ้าของร้าน); preparationInstructions เป็นคำแนะนำชง ไม่ใช่สูตรตัดสต็อก
 * อ้างอิง: Use Case 07, FR-04
 */
router.post("/products", requireRoles("owner"), async (req, res) => {
  try {
    const result = await productController.createProduct(req.body);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("POST /api/products error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/**
 * PUT /api/products/:id
 * แก้ไขเมนู ราคา และคำแนะนำชง (สำหรับเจ้าของร้าน)
 * อ้างอิง: Use Case 07, FR-04
 */
router.put("/products/:id", requireRoles("owner"), async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const result = await productController.updateProduct(productId, req.body);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("PUT /api/products/:id error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/**
 * DELETE /api/products/:id
 * ลบเมนู (สำหรับเจ้าของร้าน)
 * อ้างอิง: Use Case 07, FR-04
 */
router.delete("/products/:id", requireRoles("owner"), async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const result = await productController.deleteProduct(productId);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

module.exports = router;
