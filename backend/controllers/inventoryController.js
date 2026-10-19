const Inventory = require("../entities/Inventory");
const db = require("../db");

// Controller ตรวจ/แปลงข้อมูลจาก request แล้วคืน status กับ body ให้ route ส่งกลับเป็น HTTP response
async function listInventory() {
  const items = await Inventory.findAll();
  // รวมสต็อกต่ำ ประวัติ และสูตรไว้ในคำตอบเดียวเพื่อให้หน้าเจ้าของร้าน refresh ได้ครั้งเดียว
  const lowStock = items.filter((item) => item.stock_qty <= item.min_threshold);
  const movements = await Inventory.getMovements();
  const recipes = await Inventory.getRecipes();
  return { status: 200, body: { items, lowStock, movements, recipes } };
}

// มุมมองสำหรับบาริสต้า: แสดงเฉพาะยอดคงเหลือ หน่วย และวัตถุดิบที่ต่ำกว่าเกณฑ์
async function listStockOverview() {
  const items = await Inventory.findStockOverview();
  const lowStock = items.filter((item) => item.stock_qty <= item.min_threshold);
  return { status: 200, body: { items, lowStock } };
}

async function updateInventory(id, data) {
  const stockQty = Number(data.stockQty);
  const minThreshold = Number(data.minThreshold);
  if (!Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
    return { status: 400, body: { error: "จำนวนคงเหลือและจุดแจ้งเตือนต้องเป็นตัวเลขตั้งแต่ 0" } };
  }
  // บันทึกยอดใหม่กับ movement log ใน transaction เดียว ป้องกันยอดกับประวัติคลาดกัน
  const result = await db.transaction(async (connection) => {
    const previous = await connection.get("SELECT stock_qty FROM inventory WHERE id = ?", [id]);
    if (!previous) return null;
    const change = stockQty - Number(previous.stock_qty);
    await connection.run("UPDATE inventory SET stock_qty = ?, min_threshold = ? WHERE id = ?", [stockQty, minThreshold, id]);
    if (change !== 0) {
      await connection.run("INSERT INTO inventory_movements (inventory_id, change_qty, reason, reference_type) VALUES (?, ?, ?, ?)", [id, change, "manual_adjustment", "inventory"]);
    }
    return true;
  });
  if (!result) return { status: 404, body: { error: `ไม่พบวัตถุดิบ id ${id}` } };
  return { status: 200, body: { id, stockQty, minThreshold } };
}

async function receiveInventory(id, data) {
  const quantity = Number(data.quantity);
  const note = typeof data.note === "string" ? data.note.trim().slice(0, 120) : "";
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return { status: 400, body: { error: "จำนวนรับเข้าต้องเป็นตัวเลขมากกว่า 0" } };
  }
  const result = await Inventory.receiveStock(id, quantity, note);
  if (!result) return { status: 404, body: { error: `ไม่พบวัตถุดิบ id ${id}` } };
  return { status: 200, body: { id, received: quantity, note } };
}

async function createInventory(data) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const unit = typeof data.unit === "string" ? data.unit.trim() : "";
  const stockQty = Number(data.stockQty);
  const minThreshold = Number(data.minThreshold);
  if (!name || !unit) {
    return { status: 400, body: { error: "กรุณาระบุชื่อวัตถุดิบและหน่วยนับ" } };
  }
  if (!Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(minThreshold) || minThreshold < 0) {
    return { status: 400, body: { error: "จำนวนเริ่มต้นและจุดแจ้งเตือนต้องเป็นตัวเลขตั้งแต่ 0" } };
  }
  try {
    // Entity จะบันทึก movement ประเภท initial_stock ให้ด้วย หากเริ่มต้นด้วยยอดมากกว่า 0
    const result = await Inventory.create({ name, stockQty, minThreshold, unit });
    return { status: 201, body: { id: result.lastID, name, stockQty, minThreshold, unit } };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") return { status: 409, body: { error: "มีวัตถุดิบชื่อนี้อยู่แล้ว" } };
    throw error;
  }
}

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

async function removeRecipe(productId, inventoryId, optionType = "base", optionId = "0") {
  const result = await Inventory.deleteRecipe(Number(productId), Number(inventoryId), optionType, Number(optionId));
  if (!result.changes) return { status: 404, body: { error: "ไม่พบสูตรที่ต้องการลบ" } };
  return { status: 200, body: { productId: Number(productId), inventoryId: Number(inventoryId) } };
}

module.exports = { listInventory, listStockOverview, createInventory, updateInventory, receiveInventory, saveRecipe, removeRecipe };
