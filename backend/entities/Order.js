const db = require("../db");

// <<entity>> Order — ติดต่อฐานข้อมูลตาราง orders และ order_items
// ไม่มี Business Logic (การคำนวณราคา, Validation) ในชั้นนี้
class Order {
  /**
   * ดึงเลขคิวล่าสุดของวันนี้ เพื่อให้ Controller ใช้สร้างเลขคิวถัดไป
   * อ้างอิง: FR-04
   */
  static async getLastQueueNoToday() {
    const row = await db.get(`
      SELECT MAX(queue_no) AS last_queue
      FROM orders
      WHERE DATE(created_at) = DATE('now','localtime')
    `);
    return row ? row.last_queue || 0 : 0;
  }

  /**
   * บันทึกหัวออเดอร์ (รองรับ branchId)
   */
  static async create({ branchId = 1, orderNo, queueNo, totalAmount, paymentMethod }) {
    const result = await db.run(
      `INSERT INTO orders (branch_id, order_no, queue_no, total_amount, payment_method, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [branchId || 1, orderNo, queueNo, totalAmount, paymentMethod],
    );
    return { id: result.lastID, branchId: branchId || 1, orderNo, queueNo };
  }

  /**
   * บันทึกรายการสินค้าในออเดอร์
   */
  static async createItem({
    orderId,
    productId,
    quantity,
    unitPrice,
    subtotal,
    optionsJson,
  }) {
    return db.run(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, productId, quantity, unitPrice, subtotal, optionsJson || "{}"],
    );
  }

  /**
   * ดึงออเดอร์ที่อยู่ในคิว (pending, cooking) สำหรับหน้าจอบาริสต้า
   * รองรับการกรองตาม branchId หรือดูรวมทั้งหมด
   * อ้างอิง: FR-07, FR-08
   */
  static async findQueue(branchId = null) {
    let query = `
      SELECT o.id, o.branch_id, b.name AS branch_name, o.order_no, o.queue_no,
             o.total_amount, o.payment_method, o.status, o.created_at
      FROM orders o
      LEFT JOIN branches b ON b.id = o.branch_id
      WHERE o.status IN ('pending', 'cooking', 'ready')
    `;
    const params = [];
    if (branchId && branchId !== "all") {
      query += ` AND o.branch_id = ? `;
      params.push(parseInt(branchId, 10));
    }
    query += ` ORDER BY o.queue_no ASC `;

    const orders = await db.all(query, params);

    // ดึง items ของแต่ละออเดอร์
    for (const order of orders) {
      order.items = await db.all(
        `
        SELECT oi.id, oi.product_id, p.name AS product_name,
               oi.quantity, oi.unit_price, oi.subtotal, oi.options_json
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `,
        [order.id],
      );
    }

    return orders;
  }

  /**
   * ดึงเฉพาะจำนวนคิวตามสถานะสำหรับ Owner Dashboard
   * ใช้ query แบบ aggregate เพื่อให้ refresh คิวถี่ได้โดยไม่โหลดรายละเอียดออเดอร์ทั้งหมด
   */
  static async getQueueStats(branchId = null) {
    const params = [];
    let branchFilter = "";
    if (branchId && branchId !== "all" && branchId !== "undefined") {
      branchFilter = "AND branch_id = ?";
      params.push(parseInt(branchId, 10));
    }

    const rows = await db.all(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE status IN ('pending', 'cooking', 'ready', 'completed', 'cancelled') ${branchFilter}
       GROUP BY status`,
      params,
    );
    const statusMap = { pending: 0, cooking: 0, ready: 0, completed: 0, cancelled: 0 };
    for (const row of rows || []) statusMap[row.status] = row.count;

    return {
      active: statusMap.pending + statusMap.cooking + statusMap.ready,
      ...statusMap,
    };
  }

  /**
   * ดึงออเดอร์ตาม ID
   */
  static async findById(id) {
    return db.get("SELECT * FROM orders WHERE id = ?", [id]);
  }

  /**
   * อัปเดตสถานะออเดอร์
   * อ้างอิง: FR-08
   */
  static async updateStatus(id, status) {
    return db.run("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  }

  /**
   * ดึงข้อมูลรายงานยอดขายและสถิติสำหรับหน้าจอเจ้าของร้าน (Owner View)
   * รองรับการดูรวมทุกสาขา หรือแยกตาม branchId
   * อ้างอิง: FR-05, Use Case 08 (ดูรายงานยอดขาย)
   */
  static async getSalesReport(branchId = null, period = "today") {
    const branches = await db.all("SELECT * FROM branches ORDER BY id ASC");
    const isFiltered = branchId && branchId !== "all" && branchId !== "undefined";
    const bId = isFiltered ? parseInt(branchId, 10) : null;
    const reportPeriod = ["today", "7d", "30d", "all"].includes(period) ? period : "today";

    const branchFilter = isFiltered ? "AND branch_id = ?" : "";
    const branchParams = isFiltered ? [bId] : [];
    const periodFilters = {
      today: "DATE(created_at) = DATE('now', 'localtime')",
      "7d": "DATE(created_at) >= DATE('now', 'localtime', '-6 days')",
      "30d": "DATE(created_at) >= DATE('now', 'localtime', '-29 days')",
      all: "1=1",
    };
    const dateFilter = periodFilters[reportPeriod];
    const dateOrderFilter = reportPeriod === "all" ? "" : `AND ${dateFilter}`;
    const comparisonFilter = {
      today: "DATE(created_at) = DATE('now', 'localtime', '-1 day')",
      "7d": "DATE(created_at) >= DATE('now', 'localtime', '-13 days') AND DATE(created_at) < DATE('now', 'localtime', '-6 days')",
      "30d": "DATE(created_at) >= DATE('now', 'localtime', '-59 days') AND DATE(created_at) < DATE('now', 'localtime', '-29 days')",
    }[reportPeriod];

    const salesRow = await db.get(
      `
      SELECT 
          COALESCE(SUM(total_amount), 0) AS sales,
          COUNT(*) AS orders
      FROM orders 
        WHERE ${dateFilter} AND status != 'cancelled' ${branchFilter}
    `,
      branchParams,
    );

    const comparisonRow = comparisonFilter ? await db.get(
      `SELECT COALESCE(SUM(total_amount), 0) AS sales
       FROM orders WHERE ${comparisonFilter} AND status != 'cancelled' ${branchFilter}`,
      branchParams,
    ) : null;

    const completedRow = await db.get(
      `SELECT COUNT(*) AS count FROM orders
       WHERE ${dateFilter} AND status = 'completed' ${branchFilter}`,
      branchParams,
    );

    const statusRows = await db.all(
      `
      SELECT status, COUNT(*) AS count 
      FROM orders 
      WHERE 1=1 ${branchFilter}
      GROUP BY status
    `,
      branchParams,
    );
    const statusMap = { pending: 0, cooking: 0, ready: 0, completed: 0, cancelled: 0 };
    (statusRows || []).forEach((r) => {
      statusMap[r.status] = r.count;
    });

    const paymentRows = await db.all(
      `
      SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
      FROM orders
        WHERE status != 'cancelled' ${dateOrderFilter} ${branchFilter}
      GROUP BY payment_method
    `,
      branchParams,
    );

    const orderBranchFilter = isFiltered ? "AND o.branch_id = ?" : "";
    const topProducts = await db.all(
      `
      SELECT 
        p.id, p.name, p.image_url, c.name AS category_name,
        SUM(oi.quantity) AS total_qty,
        SUM(oi.subtotal) AS total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' ${reportPeriod === "all" ? "" : `AND ${dateFilter.replaceAll("created_at", "o.created_at")}`} ${orderBranchFilter}
      GROUP BY p.id
      ORDER BY total_qty DESC
      LIMIT 5
    `,
      branchParams,
    );

    const recentOrders = await db.all(
      `
      SELECT o.id, o.branch_id, b.name AS branch_name, o.order_no, o.queue_no,
             o.total_amount, o.payment_method, o.status, o.created_at
      FROM orders o
      LEFT JOIN branches b ON b.id = o.branch_id
        WHERE 1=1 ${reportPeriod === "all" ? "" : `AND ${dateFilter.replaceAll("created_at", "o.created_at")}`} ${orderBranchFilter}
      ORDER BY o.id DESC
      LIMIT 50
    `,
      branchParams,
    );

    if (recentOrders.length > 0) {
      const orderIds = recentOrders.map((order) => order.id);
      const placeholders = orderIds.map(() => "?").join(", ");
      const recentItems = await db.all(
        `
        SELECT oi.order_id, oi.id, oi.product_id, p.name AS product_name,
               oi.quantity, oi.unit_price, oi.subtotal, oi.options_json
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.order_id DESC, oi.id ASC
      `,
        orderIds,
      );
      const itemsByOrderId = new Map();

      for (const item of recentItems) {
        const orderItems = itemsByOrderId.get(item.order_id) || [];
        orderItems.push(item);
        itemsByOrderId.set(item.order_id, orderItems);
      }

      for (const order of recentOrders) {
        order.items = itemsByOrderId.get(order.id) || [];
      }
    }

    return {
      selectedBranchId: branchId || "all",
      period: reportPeriod,
      branches: branches || [],
      periodSales: {
        sales: salesRow ? salesRow.sales : 0,
        orders: salesRow ? salesRow.orders : 0,
      },
      comparison: comparisonRow ? { sales: comparisonRow.sales } : null,
      completedInPeriod: completedRow ? completedRow.count : 0,
      queueStats: {
        active: (statusMap.pending || 0) + (statusMap.cooking || 0) + (statusMap.ready || 0),
        completed: statusMap.completed || 0,
        cancelled: statusMap.cancelled || 0,
        pending: statusMap.pending || 0,
        cooking: statusMap.cooking || 0,
        ready: statusMap.ready || 0,
      },
      paymentBreakdown: paymentRows || [],
      topProducts: topProducts || [],
      recentOrders: recentOrders || [],
    };
  }
}

module.exports = Order;
