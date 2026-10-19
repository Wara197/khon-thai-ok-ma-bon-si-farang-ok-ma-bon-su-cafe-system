-- Static reference for the 13 tables created in backend/db.js.
-- Runtime startup executes DDL in db.js, including migrations and PRAGMA settings.
-- This file documents the current fresh-install structure; it does not seed data.
-- SQLite foreign-key enforcement is enabled by db.setup() with PRAGMA foreign_keys=ON.

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  image_url TEXT DEFAULT NULL,
  preparation_instructions TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS product_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_type TEXT NOT NULL,
  name TEXT NOT NULL,
  extra_price INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL DEFAULT 1,
  order_no TEXT NOT NULL UNIQUE,
  queue_no INTEGER NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  options_json TEXT DEFAULT '{}',
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  stock_qty REAL NOT NULL DEFAULT 0,
  min_threshold REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL
);

-- Legacy source table retained for one-time recipe migration.
CREATE TABLE IF NOT EXISTS product_recipes (
  product_id INTEGER NOT NULL,
  inventory_id INTEGER NOT NULL,
  quantity_per_unit REAL NOT NULL CHECK(quantity_per_unit > 0),
  PRIMARY KEY (product_id, inventory_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_id INTEGER NOT NULL,
  change_qty REAL NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

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
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'cashier', 'barista')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
