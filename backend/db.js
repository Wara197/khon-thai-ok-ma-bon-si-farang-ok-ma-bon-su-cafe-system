const path = require("path");
const sqlite3 = require("sqlite3");

// ---------------------------------------------------------------------------
// SQLite Connection — สร้างไฟล์ cafe_pos.db ในโฟลเดอร์เดียวกับ server.js
// ---------------------------------------------------------------------------
const db = new sqlite3.Database(path.join(__dirname, "cafe_pos.db"));

// Promise wrappers สำหรับ sqlite3 (เหมือนตัวอย่าง wk09-code-demo/bcm/db.js)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// SQLite ใช้ connection เดียว จึงต้องเก็บชุดคำสั่งของการสร้างออเดอร์ไว้ใน
// transaction เดียวกัน เพื่อไม่ให้เกิด order header ค้างหรือเลขคิวชนกัน
async function transaction(work) {
  await run("BEGIN IMMEDIATE TRANSACTION");
  try {
    const result = await work({ run, get, all });
    await run("COMMIT");
    return result;
  } catch (error) {
    try { await run("ROLLBACK"); } catch (_) { /* transaction may already be closed */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Setup — สร้างตาราง runtime และ migration ที่ปลอดภัยกับฐานข้อมูลเดิม
// ---------------------------------------------------------------------------
async function setup() {
  // เปิด WAL mode เพื่อประสิทธิภาพ
  await run("PRAGMA journal_mode=WAL");
  await run("PRAGMA foreign_keys=ON");

  // 0. branches — สาขาของร้าน (จำลอง 3 สาขา)
  await run(`
    CREATE TABLE IF NOT EXISTS branches (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL,
      address TEXT    DEFAULT NULL
    )
  `);

  // 1. categories — หมวดหมู่เมนู
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 2. products — รายการเมนูเครื่องดื่ม/อาหาร
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      base_price  INTEGER NOT NULL,
      image_url   TEXT    DEFAULT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // 3. product_options — ตัวเลือกขนาด / ความหวาน / ท็อปปิง
  await run(`
    CREATE TABLE IF NOT EXISTS product_options (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      option_type TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      extra_price INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 4. orders — หัวออเดอร์
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id      INTEGER NOT NULL DEFAULT 1,
      order_no       TEXT    NOT NULL UNIQUE,
      queue_no       INTEGER NOT NULL,
      total_amount   INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT    NOT NULL DEFAULT 'cash',
      payment_status TEXT    NOT NULL DEFAULT 'paid',
      status         TEXT    NOT NULL DEFAULT 'pending',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `);

  // Migration สำหรับฐานข้อมูลที่สร้างจากเวอร์ชันก่อนหน้า
  try {
    const cols = await all("PRAGMA table_info(orders)");
    if (cols && !cols.some((c) => c.name === "branch_id")) {
      await run("ALTER TABLE orders ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1");
    }
    if (cols && !cols.some((c) => c.name === "discount_amount")) {
      await run("ALTER TABLE orders ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0");
    }
    if (cols && !cols.some((c) => c.name === "payment_status")) {
      await run("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid'");
    }
  } catch (err) {
    // ignore
  }

  // 5. order_items — รายการสินค้าในออเดอร์
  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL,
      product_id   INTEGER NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      unit_price   INTEGER NOT NULL,
      subtotal     INTEGER NOT NULL,
      options_json TEXT    DEFAULT '{}',
      FOREIGN KEY (order_id)   REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // 6. inventory + product_recipes — รองรับ FR-09
  await run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      stock_qty REAL NOT NULL DEFAULT 0,
      min_threshold REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      product_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      quantity_per_unit REAL NOT NULL CHECK(quantity_per_unit > 0),
      PRIMARY KEY (product_id, inventory_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      change_qty REAL NOT NULL,
      reason TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS product_recipe_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      option_type TEXT NOT NULL DEFAULT 'base',
      option_id INTEGER NOT NULL DEFAULT 0,
      quantity_per_unit REAL NOT NULL CHECK(quantity_per_unit > 0),
      UNIQUE(product_id, inventory_id, option_type, option_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);
  await run("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime')))");

  // Authentication: user identities and opaque, revocable browser sessions.
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'cashier', 'barista')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Seed mock data (เฉพาะครั้งแรกที่ยังไม่มีข้อมูล)
  await seedBranches();
  await seedMockData();
  await seedSampleOrders();
  await seedTemperatureAndBakeryOptions();
  await seedInventoryAndRecipes();
}

async function seedInventoryAndRecipes() {
  const count = await get("SELECT COUNT(*) AS c FROM inventory");
  if (!count || count.c === 0) {
    const seeds = [
      ["เมล็ดกาแฟ", 3000, 500, "กรัม"],
      ["นมสด", 12000, 2000, "มล."],
      ["ผงชา", 1500, 250, "กรัม"],
      ["ผลไม้/ไซรัป", 5000, 800, "มล."],
      ["เบเกอรี่", 60, 10, "ชิ้น"],
    ];
    for (const seed of seeds) {
      await run("INSERT INTO inventory (name, stock_qty, min_threshold, unit) VALUES (?, ?, ?, ?)", seed);
    }
  }

  // เติมน้ำตาลให้ฐานข้อมูลเดิมด้วย โดยไม่แก้ยอดคงเหลือหากมีรายการนี้อยู่แล้ว
  await run("INSERT OR IGNORE INTO inventory (name, stock_qty, min_threshold, unit) VALUES (?, ?, ?, ?)", ["น้ำตาล", 5000, 500, "กรัม"]);

  const migrated = await get("SELECT name FROM schema_migrations WHERE name = 'product_recipes_to_rules_v1'");
  if (!migrated) {
    await run(`INSERT OR IGNORE INTO product_recipe_rules (product_id, inventory_id, option_type, option_id, quantity_per_unit)
      SELECT product_id, inventory_id, 'base', 0, quantity_per_unit FROM product_recipes`);
    const recipeCount = await get("SELECT COUNT(*) AS c FROM product_recipe_rules");
    if (!recipeCount || recipeCount.c === 0) {
      const products = await all("SELECT id, category_id FROM products");
      const inventory = await all("SELECT id, name FROM inventory");
      const byName = Object.fromEntries(inventory.map((item) => [item.name, item.id]));
      for (const product of products) {
        const recipe = product.category_id === 1
          ? [[byName["เมล็ดกาแฟ"], 18], [byName["นมสด"], 120]]
          : product.category_id === 2
            ? [[byName["ผงชา"], 15], [byName["นมสด"], 120]]
            : product.category_id === 3
              ? [[byName["ผลไม้/ไซรัป"], 180]]
              : [[byName["เบเกอรี่"], 1]];
        for (const [inventoryId, quantity] of recipe) {
          await run("INSERT OR IGNORE INTO product_recipe_rules (product_id, inventory_id, option_type, option_id, quantity_per_unit) VALUES (?, ?, 'base', 0, ?)", [product.id, inventoryId, quantity]);
        }
      }
    }
    await run("INSERT INTO schema_migrations (name) VALUES ('product_recipes_to_rules_v1')");
  }

  // สูตรตั้งต้นเพื่อสาธิต: น้ำตาลต่อแก้ว 0/25/50/75/100% = 0/3/6/9/12 กรัม
  // INSERT OR IGNORE รักษาสูตรที่เจ้าของร้านปรับเอง และเจ้าของแก้ปริมาณจริงได้ในหน้าสูตร
  const sugar = await get("SELECT id FROM inventory WHERE name = ?", ["น้ำตาล"]);
  const sweetOptions = await all("SELECT id, name FROM product_options WHERE option_type = 'sweetness'");
  const beverageProducts = await all("SELECT id FROM products WHERE is_active = 1 AND category_id != 4");
  const gramsByPercent = { 0: 0, 25: 3, 50: 6, 75: 9, 100: 12 };
  if (sugar) {
    for (const option of sweetOptions) {
      const percent = Number(option.name.match(/(\d+)\s*%/)?.[1]);
      const grams = gramsByPercent[percent];
      if (!Number.isFinite(grams) || grams <= 0) continue;
      for (const product of beverageProducts) {
        await run("INSERT OR IGNORE INTO product_recipe_rules (product_id, inventory_id, option_type, option_id, quantity_per_unit) VALUES (?, ?, 'sweetness', ?, ?)", [product.id, sugar.id, option.id, grams]);
      }
    }
  }
}

async function seedTemperatureAndBakeryOptions() {
  const tempCount = await get("SELECT COUNT(*) AS c FROM product_options WHERE option_type = 'temperature'");
  if (!tempCount || tempCount.c === 0) {
    await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["temperature", "ร้อน (Hot)", 0]);
    await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["temperature", "เย็น (Iced)", 5]);
    await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["temperature", "ปั่น (Frappe)", 10]);
  }

  const bakeryCount = await get("SELECT COUNT(*) AS c FROM product_options WHERE option_type = 'bakery_option'");
  if (!bakeryCount || bakeryCount.c === 0) {
    await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["bakery_option", "อุ่นร้อน (Warm Up)", 0]);
    await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["bakery_option", "รับปกติ ไม่ต้องอุ่น (Take as is)", 0]);
  }
}

async function seedBranches() {
  const branchCount = await get("SELECT COUNT(*) AS c FROM branches");
  if (!branchCount || branchCount.c === 0) {
    await run("INSERT INTO branches (id, name, address) VALUES (?, ?, ?)", [1, "สาขา 1: หน้า ม.บูรพา (Main Campus)", "ถนนลงหาดบางแสน ชลบุรี"]);
    await run("INSERT INTO branches (id, name, address) VALUES (?, ?, ?)", [2, "สาขา 2: ห้างแหลมทอง (Mall Branch)", "ชั้น 1 ศูนย์การค้าแหลมทอง บางแสน"]);
    await run("INSERT INTO branches (id, name, address) VALUES (?, ?, ?)", [3, "สาขา 3: ชายหาดวอนนภา (Beachfront)", "ถนนเลียบหาดวอนนภา ชลบุรี"]);
  }
}

async function seedSampleOrders() {
  const orderCount = await get("SELECT COUNT(*) AS c FROM orders");
  if (!orderCount || orderCount.c === 0) {
    const o1 = await run(
      "INSERT INTO orders (order_no, queue_no, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-2 hours'))",
      ["ORD-20261018-001", 1, 140, "qr", "completed"],
    );
    await run(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json) VALUES (?, ?, ?, ?, ?, ?)",
      [o1.lastID, 3, 2, 70, 140, JSON.stringify({ size: "M (+10)", sweetness: "หวาน 50%", toppings: [] })],
    );

    const o2 = await run(
      "INSERT INTO orders (order_no, queue_no, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-1 hour'))",
      ["ORD-20261018-002", 2, 195, "cash", "completed"],
    );
    await run(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json) VALUES (?, ?, ?, ?, ?, ?)",
      [o2.lastID, 6, 1, 85, 85, JSON.stringify({ size: "M (+10)", sweetness: "หวาน 25%", toppings: ["วิปครีม (+15)"] })],
    );
    await run(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json) VALUES (?, ?, ?, ?, ?, ?)",
      [o2.lastID, 9, 2, 55, 110, JSON.stringify({ note: "อุ่นร้อน" })],
    );

    const o3 = await run(
      "INSERT INTO orders (order_no, queue_no, total_amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-30 minutes'))",
      ["ORD-20261018-003", 3, 65, "transfer", "completed"],
    );
    await run(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json) VALUES (?, ?, ?, ?, ?, ?)",
      [o3.lastID, 5, 1, 65, 65, JSON.stringify({ size: "S", sweetness: "หวาน 50%", toppings: [] })],
    );
  }
}

// ---------------------------------------------------------------------------
// Seed Mock Data — เมนูกาแฟ 12 รายการ + ตัวเลือก
// ---------------------------------------------------------------------------
async function seedMockData() {
  const { c } = await get("SELECT COUNT(*) AS c FROM categories");
  if (c > 0) return; // มีข้อมูลแล้ว ไม่ต้อง seed ซ้ำ

  console.log("🌱 Seeding mock data...");

  // --- หมวดหมู่ ---
  await run("INSERT INTO categories (name, sort_order) VALUES (?, ?)", ["กาแฟ", 1]);
  await run("INSERT INTO categories (name, sort_order) VALUES (?, ?)", ["ชา", 2]);
  await run("INSERT INTO categories (name, sort_order) VALUES (?, ?)", ["ปั่น", 3]);
  await run("INSERT INTO categories (name, sort_order) VALUES (?, ?)", ["เบเกอรี่", 4]);

  // --- เมนู (10 รายการ) พร้อมรูปภาพเริ่มต้น ---
  // กาแฟ (category_id = 1)
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [1, "เอสเพรสโซ (Espresso)", 45, "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [1, "อเมริกาโน (Americano)", 50, "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [1, "ลาเต้ (Latte)", 60, "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [1, "คาปูชิโน (Cappuccino)", 60, "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [1, "มอคค่า (Mocha)", 65, "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=60"],
  );

  // ชา (category_id = 2)
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [2, "ชาเขียวมัทฉะ (Matcha Latte)", 65, "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [2, "ชาไทยเย็น (Thai Milk Tea)", 50, "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60"],
  );

  // ปั่น/สมูทตี้ (category_id = 3)
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [3, "สตรอว์เบอร์รีสมูทตี้ (Strawberry Smoothie)", 70, "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=60"],
  );

  // เบเกอรี่ (category_id = 4)
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [4, "ครัวซองต์เนยสด (Butter Croissant)", 55, "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60"],
  );
  await run(
    "INSERT INTO products (category_id, name, base_price, image_url) VALUES (?, ?, ?, ?)",
    [4, "บราวนี่ดาร์กช็อกโกแลต (Dark Choc Brownie)", 50, "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60"],
  );

  // --- ตัวเลือก (Product Options) ---
  // ขนาด (size)
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["size", "S", 0]);
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["size", "M", 10]);
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["size", "L", 20]);

  // ความหวาน (sweetness) — ไม่คิดเงินเพิ่ม
  await run(
    "INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)",
    ["sweetness", "หวาน 0% (ไม่หวาน)", 0],
  );
  await run(
    "INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)",
    ["sweetness", "หวาน 25% (หวานน้อย)", 0],
  );
  await run(
    "INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)",
    ["sweetness", "หวาน 50% (หวานปานกลาง)", 0],
  );
  await run(
    "INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)",
    ["sweetness", "หวาน 75% (หวานปกติ)", 0],
  );
  await run(
    "INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)",
    ["sweetness", "หวาน 100% (หวานมาก)", 0],
  );

  // ท็อปปิง (topping)
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["topping", "ไข่มุก", 15]);
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["topping", "วิปครีม", 15]);
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["topping", "ช็อตเพิ่ม", 20]);
  await run("INSERT INTO product_options (option_type, name, extra_price) VALUES (?, ?, ?)", ["topping", "เยลลี่", 10]);

  console.log("✅ Mock data seeded successfully!");
}

module.exports = { run, get, all, transaction, setup };
