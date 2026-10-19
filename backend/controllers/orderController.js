const Product = require("../entities/Product");
const ProductOption = require("../entities/ProductOption");
const Order = require("../entities/Order");
const Inventory = require("../entities/Inventory");
const db = require("../db");

// <<control>> OrderController — Business Logic สำหรับจัดการออเดอร์
// ตัดสินใจตามกฎ Use Case 01: รับออเดอร์และคำนวณราคา

/**
 * สร้างออเดอร์ใหม่
 * อ้างอิง: FR-03 (Validate), FR-04 (เลขคิว), FR-05 (คำนวณราคา), FR-06 (ชำระเงิน), FR-07 (ส่งให้บาริสต้า)
 *
 * @param {Object} data - { paymentMethod, items: [{ productId, quantity, size, sweetness, toppings }] }
 */
async function createOrder(data) {
  const { paymentMethod, items, branchId, discountAmount = 0 } = data;

  // --- FR-03: Validate ข้อมูลที่จำเป็น ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { status: 400, body: { error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" } };
  }

  const validPayments = ["cash", "transfer", "qr"];
  if (!paymentMethod || !validPayments.includes(paymentMethod)) {
    return { status: 400, body: { error: "กรุณาเลือกวิธีชำระเงิน (cash, transfer, qr)" } };
  }

  const parsedBranchId = Number(branchId) || 1;
  const parsedDiscount = Number(discountAmount);
  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
    return { status: 400, body: { error: "ส่วนลดต้องเป็นตัวเลขตั้งแต่ 0 บาท" } };
  }

  // --- FR-05: คำนวณราคาแต่ละรายการ ---
  let totalAmount = 0;
  const resolvedItems = [];

  for (const item of items) {
    const {
      productId,
      quantity,
      sizeId,
      sweetnessId,
      toppingIds,
      temperatureId,
      bakeryOptionId,
    } = item;

    // Validate: ต้องมี productId และ quantity
    if (!productId || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
      return { status: 400, body: { error: "ข้อมูลรายการสินค้าไม่ถูกต้อง (ต้องระบุ productId และ quantity)" } };
    }

    // ตรวจสอบว่าเมนูมีอยู่จริง
    const product = await Product.findById(productId);
    if (!product) {
      return { status: 404, body: { error: `ไม่พบเมนู id ${productId}` } };
    }

    // ตรวจสอบว่าเป็นขนม/เบเกอรี่หรือไม่
    const isBakery =
      product.category_name === "เบเกอรี่" ||
      product.category_id === 4 ||
      (product.category_name &&
        (product.category_name.includes("ขนม") ||
          product.category_name.includes("อาหาร") ||
          product.category_name.toLowerCase().includes("bakery")));

    // FR-03: ต้องเลือกขนาด (sizeId) เฉพาะสำหรับเครื่องดื่ม (ถ้าเป็นขนมไม่ต้องเลือก)
    if (!isBakery && (!temperatureId || !sizeId || !sweetnessId)) {
      return { status: 400, body: { error: "กรุณาเลือกประเภทเครื่องดื่ม ขนาด และระดับความหวานให้ครบ" } };
    }

    // คำนวณราคา: base_price + ประเภทเครื่องดื่ม (ร้อน/เย็น/ปั่น) + ขนาด + ท็อปปิง
    let unitPrice = product.base_price;
    let selectedTemperature = null;
    let selectedSize = null;
    let selectedSweetness = null;
    let selectedToppings = [];
    let selectedBakeryOption = null;

    // 1. ตัวเลือกประเภทเครื่องดื่ม (ร้อน/เย็น/ปั่น)
    if (temperatureId) {
      const tempOption = await ProductOption.findById(temperatureId);
      if (!tempOption || tempOption.option_type !== "temperature") return { status: 400, body: { error: "ประเภทเครื่องดื่มไม่ถูกต้อง" } };
      selectedTemperature = tempOption;
      unitPrice += tempOption.extra_price;
    }

    // 2. ตัวเลือกขนาดแก้ว (เฉพาะเครื่องดื่ม)
    if (sizeId) {
      const sizeOption = await ProductOption.findById(sizeId);
      if (!sizeOption || sizeOption.option_type !== "size") return { status: 400, body: { error: "ขนาดแก้วไม่ถูกต้อง" } };
      selectedSize = sizeOption;
      unitPrice += sizeOption.extra_price;
    }

    if (sweetnessId) {
      const sweetnessOption = await ProductOption.findById(sweetnessId);
      if (!sweetnessOption || sweetnessOption.option_type !== "sweetness") return { status: 400, body: { error: "ระดับความหวานไม่ถูกต้อง" } };
      selectedSweetness = sweetnessOption;
    }

    // 3. ท็อปปิงเสริม (ถ้ามี)
    if (toppingIds && toppingIds.length > 0) {
      const toppings = await ProductOption.findByIds(toppingIds);
      if (toppings.length !== toppingIds.length || toppings.some((topping) => topping.option_type !== "topping")) {
        return { status: 400, body: { error: "ท็อปปิงไม่ถูกต้อง" } };
      }
      selectedToppings = toppings;
      for (const topping of toppings) {
        unitPrice += topping.extra_price;
      }
    }

    // 4. ตัวเลือกเบเกอรี่ (ถ้ามี)
    if (bakeryOptionId) {
      const bakeryOpt = await ProductOption.findById(bakeryOptionId);
      if (!bakeryOpt || bakeryOpt.option_type !== "bakery_option") return { status: 400, body: { error: "ตัวเลือกเบเกอรี่ไม่ถูกต้อง" } };
      selectedBakeryOption = bakeryOpt;
      unitPrice += bakeryOpt.extra_price;
    }

    const subtotal = unitPrice * quantity;
    totalAmount += subtotal;

    // เก็บข้อมูลตัวเลือกเป็น JSON ครบถ้วน
    const optionsJson = JSON.stringify({
      temperatureId: temperatureId || null,
      temperatureName: selectedTemperature?.name || null,
      sizeId: sizeId || null,
      sizeName: selectedSize?.name || null,
      sweetnessId: sweetnessId || null,
      sweetnessName: selectedSweetness?.name || null,
      toppingIds: toppingIds || [],
      toppingNames: selectedToppings.map((topping) => topping.name),
      bakeryOptionId: bakeryOptionId || null,
      bakeryOptionName: selectedBakeryOption?.name || null,
      isBakery: !!isBakery,
      // เก็บข้อความวิธีชงไว้แยกจากสูตรวัตถุดิบ เพื่อให้ออเดอร์เดิมไม่เปลี่ยนเมื่อเจ้าของแก้เมนู
      preparationInstructions: product.preparation_instructions || "",
    });

    resolvedItems.push({
      productId,
      quantity,
      sizeId: sizeId || null,
      sweetnessId: sweetnessId || null,
      temperatureId: temperatureId || null,
      bakeryOptionId: bakeryOptionId || null,
      unitPrice,
      subtotal,
      optionsJson,
    });
  }

  if (parsedDiscount > totalAmount) {
    return { status: 400, body: { error: "ส่วนลดต้องไม่มากกว่ายอดสินค้า" } };
  }
  const grossAmount = totalAmount;
  totalAmount -= parsedDiscount;

  // FR-04/FR-09: จองเลขคิว ตรวจสต็อก บันทึก order/items และตัด stock เป็น atomic transaction
  const order = await db.transaction(async (connection) => {
    const requirements = await Inventory.findRequirements(resolvedItems, connection);
    const needed = new Map();
    for (const item of resolvedItems) {
      const productRules = requirements.filter((rule) => rule.product_id === item.productId);
      const matchingRules = productRules.filter((rule) => rule.option_type === "base"
        || (rule.option_type === "size" && Number(rule.option_id) === Number(item.sizeId))
        || (rule.option_type === "temperature" && Number(rule.option_id) === Number(item.temperatureId))
        || (rule.option_type === "sweetness" && Number(rule.option_id) === Number(item.sweetnessId))
        || (rule.option_type === "bakery_option" && Number(rule.option_id) === Number(item.bakeryOptionId)));
      if (!matchingRules.length) {
        const error = new Error(`ยังไม่ได้กำหนดสูตรวัตถุดิบสำหรับเมนู ${item.productId}`);
        error.status = 400;
        throw error;
      }

      const rulesByIngredient = new Map();
      for (const rule of matchingRules) {
        const current = rulesByIngredient.get(rule.inventory_id);
        // สูตรตามตัวเลือกเฉพาะ (เช่น ความหวาน) แทนสูตร base ของวัตถุดิบชนิดเดียวกัน
        const priority = rule.option_type === "base" ? 0 : rule.option_type === "size" || rule.option_type === "sweetness" ? 3 : 2;
        if (!current || priority > current.priority) rulesByIngredient.set(rule.inventory_id, { ...rule, priority });
      }
      for (const rule of rulesByIngredient.values()) {
        needed.set(rule.inventory_id, {
          ...rule,
          quantity: (needed.get(rule.inventory_id)?.quantity || 0) + rule.quantity_per_unit * item.quantity,
        });
      }
      const savedOptions = JSON.parse(item.optionsJson);
      savedOptions.inventoryConsumptions = [...rulesByIngredient.values()].map((rule) => ({
        inventoryId: rule.inventory_id,
        inventoryName: rule.name,
        unit: rule.unit,
        quantity: rule.quantity_per_unit * item.quantity,
      }));
      item.optionsJson = JSON.stringify(savedOptions);
    }
    for (const ingredient of needed.values()) {
      if (ingredient.stock_qty < ingredient.quantity) {
        const error = new Error(`วัตถุดิบไม่พอ: ${ingredient.name}`);
        error.status = 400;
        throw error;
      }
    }

    const lastQueue = await Order.getLastQueueNoToday(parsedBranchId, connection);
    const queueNo = lastQueue + 1;
    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
    const orderNo = `POS-${dateStr}-${String(parsedBranchId).padStart(2, "0")}-${String(queueNo).padStart(4, "0")}`;
    const created = await Order.create({ branchId: parsedBranchId, orderNo, queueNo, totalAmount, discountAmount: parsedDiscount, paymentMethod }, connection);
    for (const item of resolvedItems) {
      await Order.createItem({ orderId: created.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, optionsJson: item.optionsJson }, connection);
    }
    for (const ingredient of needed.values()) {
      await connection.run("UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?", [ingredient.quantity, ingredient.inventory_id]);
      await connection.run(
        "INSERT INTO inventory_movements (inventory_id, change_qty, reason, reference_type, reference_id) VALUES (?, ?, ?, ?, ?)",
        [ingredient.inventory_id, -ingredient.quantity, "order_created", "order", created.id],
      );
    }
    return created;
  });

  // --- FR-07: ส่งข้อมูลกลับ (หน้าจอบาริสต้าจะ poll จาก GET /api/orders/queue) ---
  return {
    status: 201,
    body: {
      orderId: order.id,
      branchId: order.branchId,
      orderNo: order.orderNo,
      queueNo: order.queueNo,
      totalAmount,
      grossAmount,
      discountAmount: parsedDiscount,
      paymentMethod,
      paymentStatus: "paid",
      status: "pending",
    },
  };
}

/**
 * ดึงรายการคิวสำหรับหน้าจอบาริสต้า (รองรับการกรองตามสาขา)
 * อ้างอิง: FR-07, FR-08
 */
async function getQueue(branchId = null) {
  const orders = await Order.findQueue(branchId);
  return { status: 200, body: orders };
}

/** ดึงสรุปจำนวนคิวแบบเบาสำหรับอัปเดต Owner Dashboard */
async function getQueueStats(branchId = null) {
  const stats = await Order.getQueueStats(branchId);
  return { status: 200, body: stats };
}

/**
 * เปลี่ยนสถานะออเดอร์
 * อ้างอิง: FR-08 — ลำดับสถานะ: pending → cooking → ready → completed
 */
async function updateStatus(orderId, newStatus) {
  const validStatuses = ["pending", "cooking", "ready", "completed"];
  if (!validStatuses.includes(newStatus)) {
    return { status: 400, body: { error: `สถานะไม่ถูกต้อง ต้องเป็น: ${validStatuses.join(", ")}` } };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return { status: 404, body: { error: `ไม่พบออเดอร์ id ${orderId}` } };
  }

  // อนุญาตเฉพาะสถานะถัดไปทีละขั้น เพื่อไม่ให้ข้ามขั้นตอนการทำเครื่องดื่ม
  const statusOrder = { pending: 0, cooking: 1, ready: 2, completed: 3 };
  if (statusOrder[newStatus] !== statusOrder[order.status] + 1) {
    return { status: 400, body: { error: `ไม่สามารถเปลี่ยนสถานะจาก "${order.status}" เป็น "${newStatus}" ได้` } };
  }

  await Order.updateStatus(orderId, newStatus);
  return { status: 200, body: { id: orderId, status: newStatus } };
}

/**
 * ยกเลิกออเดอร์ — ยกเลิกได้เฉพาะสถานะ pending หรือ cooking เท่านั้น
 * ออเดอร์ที่ ready หรือ completed ไม่สามารถยกเลิกได้
 */
async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    return { status: 404, body: { error: `ไม่พบออเดอร์ id ${orderId}` } };
  }

  const cancellable = ["pending", "cooking"];
  if (!cancellable.includes(order.status)) {
    return {
      status: 400,
      body: { error: `ไม่สามารถยกเลิกออเดอร์ที่อยู่ในสถานะ "${order.status}" ได้` },
    };
  }

  // คืนวัตถุดิบตามสูตรใน transaction เดียวกับการยกเลิก เพื่อไม่ให้ยอด stock เพี้ยน
  await db.transaction(async (connection) => {
    const items = await Order.getItems(orderId, connection);
    const itemsWithOptions = items.map((item) => {
      let options = {};
      try { options = JSON.parse(item.options_json || "{}"); } catch (_) { /* legacy item without valid options */ }
      return {
        productId: item.product_id,
        quantity: item.quantity,
        sizeId: options.sizeId || null,
        temperatureId: options.temperatureId || null,
        bakeryOptionId: options.bakeryOptionId || null,
        inventoryConsumptions: Array.isArray(options.inventoryConsumptions) ? options.inventoryConsumptions : null,
      };
    });
    const requirements = await Inventory.findRequirements(itemsWithOptions, connection);
    const restores = new Map();
    for (const item of itemsWithOptions) {
      if (item.inventoryConsumptions) {
        for (const consumption of item.inventoryConsumptions) {
          restores.set(consumption.inventoryId, (restores.get(consumption.inventoryId) || 0) + consumption.quantity);
        }
        continue;
      }
      const productRules = requirements.filter((rule) => rule.product_id === item.productId);
      const matchingRules = productRules.filter((rule) => rule.option_type === "base"
        || (rule.option_type === "size" && Number(rule.option_id) === Number(item.sizeId))
        || (rule.option_type === "temperature" && Number(rule.option_id) === Number(item.temperatureId))
        || (rule.option_type === "bakery_option" && Number(rule.option_id) === Number(item.bakeryOptionId)));
      const selectedRules = new Map();
      for (const rule of matchingRules) {
        const current = selectedRules.get(rule.inventory_id);
        const priority = rule.option_type === "base" ? 0 : rule.option_type === "size" ? 3 : 2;
        if (!current || priority > current.priority) selectedRules.set(rule.inventory_id, { ...rule, priority });
      }
      for (const rule of selectedRules.values()) {
        const quantity = rule.quantity_per_unit * item.quantity;
        restores.set(rule.inventory_id, (restores.get(rule.inventory_id) || 0) + quantity);
      }
    }
    await connection.run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
    for (const [inventoryId, quantity] of restores) {
      await connection.run("UPDATE inventory SET stock_qty = stock_qty + ? WHERE id = ?", [quantity, inventoryId]);
      await connection.run("INSERT INTO inventory_movements (inventory_id, change_qty, reason, reference_type, reference_id) VALUES (?, ?, ?, ?, ?)", [inventoryId, quantity, "order_cancelled", "order", orderId]);
    }
  });
  return { status: 200, body: { id: orderId, status: "cancelled", message: "ยกเลิกออเดอร์เรียบร้อยแล้ว" } };
}

/**
 * ดึงรายงานยอดขายและสถิติภาพรวมสำหรับมุมมองเจ้าของร้าน (Owner View)
 * อ้างอิง: FR-05, Use Case 08 (ดูรายงานยอดขาย)
 */
async function getSalesReport(branchId = null, period = "today") {
  const report = await Order.getSalesReport(branchId, period);
  return { status: 200, body: report };
}

module.exports = { createOrder, getQueue, getQueueStats, updateStatus, cancelOrder, getSalesReport };

