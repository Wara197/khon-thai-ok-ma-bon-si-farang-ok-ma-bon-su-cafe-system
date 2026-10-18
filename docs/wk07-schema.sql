# wk07-schema.sql: Database Schema — Coffee Shop POS
# (Reverse engineered from db.js actual SQLite schema)

-- =============================================================================
-- Coffee Shop POS Database Schema
-- ออกแบบตาม ER Diagram ใน wk07-er-diagram.md
-- รองรับทั้ง SQLite (Development) และ MySQL (Production)
-- =============================================================================

-- 0. สาขาของร้าน (branches)
CREATE TABLE IF NOT EXISTS branches (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,           -- ชื่อสาขา เช่น สาขา 1: หน้า ม.บูรพา
  address TEXT    DEFAULT NULL        -- ที่ตั้งสาขา
);

-- 1. หมวดหมู่สินค้า (categories)
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,           -- ชื่อหมวดหมู่ เช่น กาแฟ, ชา, ปั่น, เบเกอรี่
  sort_order INTEGER NOT NULL DEFAULT 0  -- ลำดับแสดงผล
);

-- 2. รายการเมนูสินค้า (products)
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,          -- FK → categories.id
  name        TEXT    NOT NULL,           -- ชื่อเมนู เช่น ลาเต้ (Latte)
  base_price  INTEGER NOT NULL,           -- ราคาฐาน (หน่วย: บาท)
  image_url   TEXT    DEFAULT NULL,       -- URL รูปภาพ (optional)
  is_active   INTEGER NOT NULL DEFAULT 1, -- 1 = เปิดขาย, 0 = ปิดขาย
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 3. ตัวเลือกสินค้า (product_options)
--    รวม size / sweetness / topping ไว้ในตารางเดียว แบ่งด้วย option_type
CREATE TABLE IF NOT EXISTS product_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  option_type TEXT    NOT NULL,           -- 'size', 'sweetness', 'topping'
  name        TEXT    NOT NULL,           -- ชื่อตัวเลือก เช่น S, M, L, ไข่มุก
  extra_price INTEGER NOT NULL DEFAULT 0  -- ราคาเพิ่มเติม (บาท)
);

-- 4. คำสั่งซื้อ / ออเดอร์ (orders)
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id      INTEGER NOT NULL DEFAULT 1, -- FK → branches.id
  order_no       TEXT    NOT NULL UNIQUE,  -- เลขออเดอร์ POS-YYYYMMDD-XXXX
  queue_no       INTEGER NOT NULL,          -- เลขคิวประจำวัน (1, 2, 3...)
  total_amount   INTEGER NOT NULL DEFAULT 0, -- ยอดรวม (บาท)
  payment_method TEXT    NOT NULL DEFAULT 'cash', -- 'cash', 'transfer', 'qr'
  status         TEXT    NOT NULL DEFAULT 'pending', -- 'pending','cooking','ready','completed','cancelled'
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- 5. รายการสินค้าในออเดอร์ (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL,           -- FK → orders.id
  product_id   INTEGER NOT NULL,           -- FK → products.id
  quantity     INTEGER NOT NULL DEFAULT 1, -- จำนวนที่สั่ง
  unit_price   INTEGER NOT NULL,           -- ราคาต่อหน่วย ณ เวลาสั่ง (Snapshot)
  subtotal     INTEGER NOT NULL,           -- unit_price × quantity
  options_json TEXT    DEFAULT '{}',       -- JSON: {sizeId, sweetnessId, toppingIds:[]}
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =============================================================================
-- Seed Data — ข้อมูลเริ่มต้น (Mock Data สำหรับทดสอบ)
-- =============================================================================

-- หมวดหมู่
INSERT INTO categories (name, sort_order) VALUES ('กาแฟ', 1);
INSERT INTO categories (name, sort_order) VALUES ('ชา', 2);
INSERT INTO categories (name, sort_order) VALUES ('ปั่น', 3);
INSERT INTO categories (name, sort_order) VALUES ('เบเกอรี่', 4);

-- เมนูกาแฟ (category_id = 1)
INSERT INTO products (category_id, name, base_price) VALUES (1, 'เอสเพรสโซ (Espresso)', 45);
INSERT INTO products (category_id, name, base_price) VALUES (1, 'อเมริกาโน (Americano)', 50);
INSERT INTO products (category_id, name, base_price) VALUES (1, 'ลาเต้ (Latte)', 60);
INSERT INTO products (category_id, name, base_price) VALUES (1, 'คาปูชิโน (Cappuccino)', 60);
INSERT INTO products (category_id, name, base_price) VALUES (1, 'มอคค่า (Mocha)', 65);

-- เมนูชา (category_id = 2)
INSERT INTO products (category_id, name, base_price) VALUES (2, 'ชาเขียวมัทฉะ (Matcha Latte)', 65);
INSERT INTO products (category_id, name, base_price) VALUES (2, 'ชาไทยเย็น (Thai Milk Tea)', 50);

-- เมนูปั่น (category_id = 3)
INSERT INTO products (category_id, name, base_price) VALUES (3, 'สตรอว์เบอร์รีสมูทตี้ (Strawberry Smoothie)', 70);

-- เมนูเบเกอรี่ (category_id = 4)
INSERT INTO products (category_id, name, base_price) VALUES (4, 'ครัวซองต์เนยสด (Butter Croissant)', 55);
INSERT INTO products (category_id, name, base_price) VALUES (4, 'บราวนี่ดาร์กช็อกโกแลต (Dark Choc Brownie)', 50);

-- ตัวเลือกขนาด (size)
INSERT INTO product_options (option_type, name, extra_price) VALUES ('size', 'S', 0);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('size', 'M', 10);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('size', 'L', 20);

-- ตัวเลือกความหวาน (sweetness) — ไม่มีราคาเพิ่ม
INSERT INTO product_options (option_type, name, extra_price) VALUES ('sweetness', 'หวาน 0% (ไม่หวาน)', 0);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('sweetness', 'หวาน 25% (หวานน้อย)', 0);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('sweetness', 'หวาน 50% (หวานปานกลาง)', 0);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('sweetness', 'หวาน 75% (หวานปกติ)', 0);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('sweetness', 'หวาน 100% (หวานมาก)', 0);

-- ตัวเลือกท็อปปิง (topping)
INSERT INTO product_options (option_type, name, extra_price) VALUES ('topping', 'ไข่มุก', 15);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('topping', 'วิปครีม', 15);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('topping', 'ช็อตเพิ่ม', 20);
INSERT INTO product_options (option_type, name, extra_price) VALUES ('topping', 'เยลลี่', 10);
