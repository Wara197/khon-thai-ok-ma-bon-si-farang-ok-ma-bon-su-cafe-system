/** กำหนด endpoints คลังสินค้าและจำกัดการแก้สต็อก/สูตรไว้สำหรับ owner */
const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const { requireRoles } = require("../auth/middleware");

const router = express.Router();

// เจ้าของร้านจัดการสต็อกและสูตรได้ ส่วนบาริสต้าดูยอดคงเหลือ/ของใกล้หมดได้อย่างเดียว
// Route แปลงผล controller เป็น HTTP และจัดการข้อผิดพลาดจากการเรียกฐานข้อมูล

router.get("/inventory", requireRoles("owner", "barista"), async (req, res) => {
  try {
    const requestedBranch = req.query.branchId || "1";
    // บาริสต้าดูได้เฉพาะ stock ของสาขาที่ผูกกับบัญชี; owner เลือกสาขาหรือดูรวมได้
    const branchId = req.user.role === "owner" ? (requestedBranch === "all" ? "all" : Number(requestedBranch)) : req.user.branch_id;
    if (branchId !== "all" && (!Number.isInteger(branchId) || branchId <= 0)) return res.status(400).json({ error: "สาขาไม่ถูกต้อง" });
    // ไม่ส่ง movement log หรือสูตรให้บาริสต้า ลดข้อมูลหลังบ้านที่ไม่จำเป็น
    const result = req.user.role === "owner"
      ? await inventoryController.listInventory(branchId)
      : await inventoryController.listStockOverview(branchId);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดคลังวัตถุดิบได้" });
  }
});

router.post("/inventory", requireRoles("owner"), async (req, res) => {
  try {
    const result = await inventoryController.createInventory(req.body, req.body.branchId);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("POST /api/inventory error:", error);
    res.status(500).json({ error: "ไม่สามารถเพิ่มวัตถุดิบได้" });
  }
});

router.put("/inventory/:id", requireRoles("owner"), async (req, res) => {
  try {
    const result = await inventoryController.updateInventory(Number(req.params.id), req.body, req.body.branchId);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("PUT /api/inventory/:id error:", error);
    res.status(500).json({ error: "ไม่สามารถอัปเดตคลังวัตถุดิบได้" });
  }
});

router.post("/inventory/:id/receive", requireRoles("owner"), async (req, res) => {
  try {
    const result = await inventoryController.receiveInventory(Number(req.params.id), req.body, req.body.branchId);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("POST /api/inventory/:id/receive error:", error);
    res.status(500).json({ error: "ไม่สามารถบันทึกรับวัตถุดิบได้" });
  }
});

router.put("/recipes", requireRoles("owner"), async (req, res) => {
  try {
    const result = await inventoryController.saveRecipe(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("PUT /api/recipes error:", error);
    res.status(500).json({ error: "ไม่สามารถบันทึกสูตรได้" });
  }
});

router.delete("/recipes/:productId/:inventoryId/:optionType/:optionId", requireRoles("owner"), async (req, res) => {
  try {
    const result = await inventoryController.removeRecipe(req.params.productId, req.params.inventoryId, req.params.optionType, req.params.optionId);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("DELETE /api/recipes error:", error);
    res.status(500).json({ error: "ไม่สามารถลบสูตรได้" });
  }
});

module.exports = router;
