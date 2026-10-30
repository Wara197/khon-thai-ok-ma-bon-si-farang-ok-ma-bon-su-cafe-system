/** ตรวจข้อมูลและใช้กฎธุรกิจสำหรับคลังวัตถุดิบ สูตร และภาพรวมสต็อก */
const Inventory = require("../entities/Inventory");
const db = require("../db");

// Controller ตรวจ/แปลงข้อมูลจาก request แล้วคืน status กับ body ให้ route ส่งกลับเป็น HTTP response
/** เตรียมข้อมูลคลัง สูตร และ movement สำหรับหน้าจัดการของ owner */
async function listInventory(branchId = 1) {
  const items = await Inventory.findAll(branchId);
  // รวมสต็อกต่ำ ประวัติ และสูตรไว้ในคำตอบเดียวเพื่อให้หน้าเจ้าของร้าน refresh ได้ครั้งเดียว
  const lowStock = items.filter((item) => item.stock_qty <= item.min_threshold);
  const movements = await Inventory.getMovements(30, branchId);
  const recipes = await Inventory.getRecipes();
  return { status: 200, body: { branchId, items, lowStock, movements, recipes } };
}

// มุมมองสำหรับบาริสต้า: แสดงเฉพาะยอดคงเหลือ หน่วย และวัตถุดิบที่ต่ำกว่าเกณฑ์
/** เตรียมเฉพาะยอดคงเหลือ/คำเตือนให้หน้าบาริสต้าที่อ่านข้อมูลได้อย่างเดียว */
async function listStockOverview(branchId = 1) {
  const items = await Inventory.findStockOverview(branchId);
  const lowStock = items.filter((item) => item.stock_qty <= item.min_threshold);
  return { status: 200, body: { branchId, items, lowStock } };
}

/** ตรวจยอดที่ owner ปรับ พร้อมบันทึกความต่างลง movement ภายใน transaction */
async function updateInventory(id, data, branchId = data.branchId || 1) {
  const selectedBranchId = Number(branchId);
  const stockQty = Number(data.stockQty);
  const minThreshold = Number(data.minThreshold);
  if (!Number.isInteger(selectedBranchId) || selectedBranchId <= 0 || !Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
    return { status: 400, body: { error: "จำนวนคงเหลือและจุดแจ้งเตือนต้องเป็นตัวเลขตั้งแต่ 0" } };
  }
  // บันทึกยอดใหม่กับ movement log ใน transaction เดียว ป้องกันยอดกับประวัติคลาดกัน
  const result = await db.transaction(async (connection) => {
    const previous = await connection.get("SELECT stock_qty FROM inventory_stock WHERE inventory_id = ? AND branch_id = ?", [id, selectedBranchId]);
    if (!previous) return null;
    const change = stockQty - Number(previous.stock_qty);
    await connection.run("UPDATE inventory_stock SET stock_qty = ?, min_threshold = ? WHERE inventory_id = ? AND branch_id = ?", [stockQty, minThreshold, id, selectedBranchId]);
    if (change !== 0) {
      await connection.run("INSERT INTO inventory_movements (branch_id, inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?, ?)", [selectedBranchId, id, change, "manual_adjustment", "inventory"]);
    }
    return true;
  });
  if (!result) return { status: 404, body: { error: `ไม่พบวัตถุดิบ id ${id}` } };
  return { status: 200, body: { id, branchId: selectedBranchId, stockQty, minThreshold } };
}

/** รับวัตถุดิบเข้าและบันทึกประวัติเพิ่ม stock */
async function receiveInventory(id, data, branchId = data.branchId || 1) {
  const selectedBranchId = Number(branchId);
  const quantity = Number(data.quantity);
  const note = typeof data.note === "string" ? data.note.trim().slice(0, 120) : "";
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(selectedBranchId) || selectedBranchId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return { status: 400, body: { error: "จำนวนรับเข้าต้องเป็นตัวเลขมากกว่า 0" } };
  }
  const result = await Inventory.receiveStock(id, quantity, note, selectedBranchId);
  if (!result) return { status: 404, body: { error: `ไม่พบวัตถุดิบ id ${id}` } };
  return { status: 200, body: { id, branchId: selectedBranchId, received: quantity, note } };
}

/** เพิ่มชนิดวัตถุดิบและยอดตั้งต้น โดย Entity บันทึก movement ให้ด้วย */
async function createInventory(data, branchId = data.branchId || 1) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const unit = typeof data.unit === "string" ? data.unit.trim() : "";
  const stockQty = Number(data.stockQty);
  const minThreshold = Number(data.minThreshold);
  const selectedBranchId = Number(branchId);
  if (!name || !unit) {
    return { status: 400, body: { error: "กรุณาระบุชื่อวัตถุดิบและหน่วยนับ" } };
  }
  if (!Number.isInteger(selectedBranchId) || selectedBranchId <= 0 || !Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
    return { status: 400, body: { error: "จำนวนเริ่มต้นและจุดแจ้งเตือนต้องเป็นตัวเลขตั้งแต่ 0" } };
  }
  try {
    // Entity จะบันทึก movement ประเภท initial_stock ให้ด้วย หากเริ่มต้นด้วยยอดมากกว่า 0
    const result = await Inventory.create({ name, stockQty, minThreshold, unit, branchId: selectedBranchId });
    return { status: 201, body: { id: result.lastID, name, branchId: selectedBranchId, stockQty, minThreshold, unit } };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") return { status: 409, body: { error: "มีวัตถุดิบชื่อนี้อยู่แล้ว" } };
    throw error;
  }
}

/** ตรวจ menu/ingredient/option แล้วสร้างหรือปรับกฎสูตรตัดสต็อก */
async function saveRecipe(data) {
  const productId = Number(data.productId);
  const inventoryId = Number(data.inventoryId);
  const quantityPerUnit = Number(data.quantityPerUnit);
  const optionType = data.optionType || "base";
  const optionId = optionType === "base" ? 0 : Number(data.optionId);
  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(inventoryId) || inventoryId <= 0 || !Number.isFinite(quantityPerUnit) || quantityPerUnit <= 0 || !["base", "size", "temperature", "bakery_option", "sweetness"].includes(optionType) || !Number.isInteger(optionId) || optionId < 0) {
    return { status: 400, body: { error: "ข้อมูลสูตรไม่ถูกต้อง" } };
  }
  // สูตรแบบ size/temperature/bakery_option/sweetness ต้องอ้างถึง option ชนิดเดียวกัน
  if (optionType !== "base") {
    const { get } = require("../db");
    const option = await get("SELECT id, option_type FROM product_options WHERE id = ?", [optionId]);
    if (!option || option.option_type !== optionType) return { status: 400, body: { error: "ตัวเลือกสูตรไม่ตรงกับชนิดที่ระบุ" } };
  }
  const { get } = require("../db");
  const [product, ingredient] = await Promise.all([
    get("SELECT id FROM products WHERE id = ? AND is_active = 1", [productId]),
    get("SELECT id FROM inventory WHERE id = ?", [inventoryId]),
  ]);
  if (!product || !ingredient) return { status: 404, body: { error: "ไม่พบเมนูหรือวัตถุดิบที่เลือก" } };
  await Inventory.setRecipe(productId, inventoryId, optionType, optionId, quantityPerUnit);
  return { status: 200, body: { productId, inventoryId, optionType, optionId, quantityPerUnit } };
}

/** ลบกฎสูตรตามเมนู วัตถุดิบ และขอบเขตตัวเลือก */
async function removeRecipe(productId, inventoryId, optionType = "base", optionId = "0") {
  const result = await Inventory.deleteRecipe(Number(productId), Number(inventoryId), optionType, Number(optionId));
  if (!result.changes) return { status: 404, body: { error: "ไม่พบสูตรที่ต้องการลบ" } };
  return { status: 200, body: { productId: Number(productId), inventoryId: Number(inventoryId) } };
}

module.exports = { listInventory, listStockOverview, createInventory, updateInventory, receiveInventory, saveRecipe, removeRecipe };
