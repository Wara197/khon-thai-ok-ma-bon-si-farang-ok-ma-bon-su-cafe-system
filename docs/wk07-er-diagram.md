# ER Diagram ตาม SQLite runtime

**สัปดาห์:** 07 — ER Diagram & Database Design
**แหล่งยืนยัน:** `project/backend/db.js`
**DDL reference:** [wk07-schema.sql](./wk07-schema.sql) และ [backend/schema.sql](../backend/schema.sql)

> Diagram นี้แสดงตาราง runtime ทั้ง 14 ตารางตาม `backend/db.js`. `db.js` เปิด `PRAGMA foreign_keys = ON` ใน startup connection. `orders.branch_id` และ `inventory_movements.branch_id` ใช้ผูกสาขาใน logic แต่ไม่มี FK ที่ประกาศใน DDL. `options_json` เก็บ snapshot ของตัวเลือก จึงไม่มี FK จาก `order_items` ไป `product_options`.

```mermaid
erDiagram
  CATEGORIES ||--o{ PRODUCTS : groups
  BRANCHES ||--o{ INVENTORY_STOCK : stores
  INVENTORY ||--o{ INVENTORY_STOCK : stocked_as
  BRANCHES ||--o{ ORDERS : logical_branch_id
  ORDERS ||--o{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : referenced_by
  PRODUCTS ||--o{ PRODUCT_RECIPES : legacy_recipe
  INVENTORY ||--o{ PRODUCT_RECIPES : legacy_ingredient
  PRODUCTS ||--o{ PRODUCT_RECIPE_RULES : has_rules
  INVENTORY ||--o{ PRODUCT_RECIPE_RULES : requires
  INVENTORY ||--o{ INVENTORY_MOVEMENTS : records
  BRANCHES ||--o{ INVENTORY_MOVEMENTS : logical_branch_id
  BRANCHES o|--o{ USERS : assigned_to
  USERS ||--o{ SESSIONS : owns

  BRANCHES {
    INTEGER id PK
    TEXT name
    TEXT address
  }
  CATEGORIES {
    INTEGER id PK
    TEXT name
    INTEGER sort_order
  }
  PRODUCTS {
    INTEGER id PK
    INTEGER category_id FK
    TEXT name
    INTEGER base_price
    TEXT image_url
    TEXT preparation_instructions
    INTEGER is_active
  }
  PRODUCT_OPTIONS {
    INTEGER id PK
    TEXT option_type
    TEXT name
    INTEGER extra_price
  }
  ORDERS {
    INTEGER id PK
    INTEGER branch_id
    TEXT order_no UK
    INTEGER queue_no
    INTEGER total_amount
    INTEGER discount_amount
    INTEGER cash_received
    INTEGER change_amount
    TEXT payment_method
    TEXT payment_status
    TEXT status
    TEXT created_at
  }
  ORDER_ITEMS {
    INTEGER id PK
    INTEGER order_id FK
    INTEGER product_id FK
    INTEGER quantity
    INTEGER unit_price
    INTEGER subtotal
    TEXT options_json
  }
  INVENTORY {
    INTEGER id PK
    TEXT name UK
    REAL stock_qty
    REAL min_threshold
    TEXT unit
  }
  INVENTORY_STOCK {
    INTEGER id PK
    INTEGER branch_id FK
    INTEGER inventory_id FK
    REAL stock_qty
    REAL min_threshold
  }
  PRODUCT_RECIPES {
    INTEGER product_id PK, FK
    INTEGER inventory_id PK, FK
    REAL quantity_per_unit
  }
  PRODUCT_RECIPE_RULES {
    INTEGER id PK
    INTEGER product_id FK
    INTEGER inventory_id FK
    TEXT option_type
    INTEGER option_id
    REAL quantity_per_unit
  }
  INVENTORY_MOVEMENTS {
    INTEGER id PK
    INTEGER branch_id
    INTEGER inventory_id FK
    REAL change_qty
    TEXT reason
    TEXT reference_type
    INTEGER reference_id
    TEXT created_at
  }
  SCHEMA_MIGRATIONS {
    TEXT name PK
    TEXT applied_at
  }
  USERS {
    INTEGER id PK
    TEXT username UK
    TEXT password_hash
    TEXT password_salt
    TEXT role
    INTEGER branch_id FK
    INTEGER is_active
    TEXT created_at
  }
  SESSIONS {
    INTEGER id PK
    INTEGER user_id FK
    TEXT token_hash UK
    TEXT expires_at
    TEXT created_at
  }

```

## ความหมายและข้อจำกัด

- ER diagram แสดง 14 ตารางที่ runtime สร้าง; `inventory_stock` เก็บยอดและ threshold แยกสาขา, `schema_migrations` เป็น metadata สำหรับ migration และ `product_recipes` เป็นโครงสร้าง legacy ที่ใช้ย้ายสูตรรุ่นเก่า.
- `orders.branch_id` เป็น integer มี default 1 และ `inventory_movements.branch_id` ระบุสาขา แต่ DDL runtime ไม่ประกาศ Foreign Key ไป `branches` สำหรับสองคอลัมน์นี้. `users.branch_id` มี FK ไป `branches`; เป็นค่าว่างได้สำหรับ owner.
- `order_no` มี unique constraint; `queue_no` ไม่มี unique constraint.
- `inventory_stock` มี unique constraint ร่วม `(branch_id, inventory_id)`; `product_recipe_rules` มี unique constraint ร่วม `(product_id, inventory_id, option_type, option_id)`.
- `products.base_price`, `product_options.extra_price`, `orders.total_amount`, `order_items.unit_price/subtotal` ใช้ INTEGER ใน SQLite.
- `products.preparation_instructions` เก็บข้อความวิธีชงที่เจ้าของร้านตั้งต่อเมนู; เมื่อสร้างออเดอร์ข้อความจะถูก snapshot ลง `order_items.options_json` เพื่อคงคำแนะนำเดิมของรายการที่เข้าคิวแล้ว.
- `order_items.options_json` บันทึก selected option IDs/names, topping arrays, bakery selection, `isBakery`, snapshot `inventoryConsumptions` และ `preparationInstructions`.
- Product delete เป็น soft delete (`is_active=0`), ไม่ลบ order history.
- Runtime DDL อยู่ใน `backend/db.js`; SQL file เป็น reference, startup ไม่ execute ไฟล์นั้น.
