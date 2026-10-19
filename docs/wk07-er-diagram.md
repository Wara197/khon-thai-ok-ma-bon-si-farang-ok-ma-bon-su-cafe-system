# ER Diagram ตาม SQLite runtime

**สัปดาห์:** 07 — ER Diagram & Database Design
**แหล่งยืนยัน:** `project/backend/db.js`
**DDL reference:** [wk07-schema.sql](./wk07-schema.sql) และ [backend/schema.sql](../backend/schema.sql)

> Diagram นี้แสดงตารางแกนหลัก 6 ตารางเพื่อให้อ่านความสัมพันธ์ได้ง่าย; runtime มีตารางเพิ่มเติมสำหรับคลัง สูตร movement migration และบัญชี ดูรายการครบใน SRS/as-built. `db.js` เปิด `PRAGMA foreign_keys = ON` ใน startup connection; `orders.branch_id` ไม่มี FK ที่ประกาศใน DDL. `options_json` เก็บ snapshot ของตัวเลือก จึงไม่มี FK จาก `order_items` ไป `product_options`.

```mermaid
erDiagram
  CATEGORIES ||--o{ PRODUCTS : groups
  ORDERS ||--o{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : referenced_by

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
    TEXT payment_method
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
```

## ความหมายและข้อจำกัด

- ER diagram หน้านี้วาด 6 ตารางหลัก: `branches`, `categories`, `products`, `product_options`, `orders`, `order_items`; runtime รวม 13 ตารางตาม [as-built](./as-built-reverse-engineering.md).
- `orders.branch_id` เป็น integer มี default 1 แต่ DDL runtime ไม่ประกาศ Foreign Key ไป `branches`.
- `order_no` มี unique constraint; `queue_no` ไม่มี unique constraint.
- `products.base_price`, `product_options.extra_price`, `orders.total_amount`, `order_items.unit_price/subtotal` ใช้ INTEGER ใน SQLite.
- `order_items.options_json` บันทึก selected option IDs/names, topping arrays, bakery selection, `isBakery` และ snapshot `inventoryConsumptions`.
- Product delete เป็น soft delete (`is_active=0`), ไม่ลบ order history.
- Runtime DDL อยู่ใน `backend/db.js`; SQL file เป็น reference, startup ไม่ execute ไฟล์นั้น.
