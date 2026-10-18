# เอกสารออกแบบ ER Diagram ระบบ Coffee Shop POS

**รายวิชา:** 88734065 การวิเคราะห์และออกแบบระบบ (System Analysis and Design)  
**กิจกรรม:** Workshop สัปดาห์ที่ 7 — ER Diagram & Database Design

---

## 1. แผนภาพ Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    BRANCHES ||--o{ ORDERS : "placed at"
    CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered in"
    PRODUCT_OPTIONS ||--o{ ORDER_ITEMS : "applied to"
    ORDERS ||--o{ ORDER_ITEMS : contains

    BRANCHES {
        int id PK "รหัสสาขา (AUTO)"
        text name "ชื่อสาขา เช่น หน้า ม.บูรพา, ห้างแหลมทอง, หาดวอนนภา"
        text address "ที่ตั้ง/ที่อยู่สาขา"
    }

    CATEGORIES {
        int id PK "รหัสหมวดหมู่ (AUTO)"
        text name "ชื่อหมวดหมู่ เช่น กาแฟ ชา ปั่น เบเกอรี่"
        int sort_order "ลำดับแสดงผล"
    }

    PRODUCTS {
        int id PK "รหัสสินค้า (AUTO)"
        int category_id FK "รหัสหมวดหมู่"
        text name "ชื่อเมนูสินค้า"
        int base_price "ราคาฐาน (หน่วย: บาท)"
        text image_url "URL รูปภาพสินค้า (optional)"
        int is_active "สถานะเปิดขาย (1=เปิด, 0=ปิด)"
    }

    PRODUCT_OPTIONS {
        int id PK "รหัสตัวเลือก (AUTO)"
        text option_type "ประเภท: size / sweetness / topping"
        text name "ชื่อตัวเลือก เช่น S, M, L, ไข่มุก"
        int extra_price "ราคาเพิ่มเติม (บาท)"
    }

    ORDERS {
        int id PK "รหัสออเดอร์ (AUTO)"
        int branch_id FK "รหัสสาขาที่รับออเดอร์"
        text order_no "เลขออเดอร์ POS-YYYYMMDD-XXXX (UNIQUE)"
        int queue_no "เลขคิวประจำวัน เช่น 1, 2, 3"
        int total_amount "ยอดรวมทั้งหมด (บาท)"
        text payment_method "วิธีชำระ: cash / transfer / qr"
        text status "สถานะ: pending / cooking / ready / completed"
        text created_at "วันเวลาที่สั่ง (datetime localtime)"
    }

    ORDER_ITEMS {
        int id PK "รหัสรายการ (AUTO)"
        int order_id FK "รหัสออเดอร์หลัก"
        int product_id FK "รหัสสินค้า"
        int quantity "จำนวนที่สั่ง"
        int unit_price "ราคาต่อหน่วย ณ เวลาสั่ง (Snapshot)"
        int subtotal "ราคารวมของรายการนี้"
        text options_json "JSON ตัวเลือกที่เลือก {sizeId, sweetnessId, toppingIds}"
    }
```

---

## 2. ตารางสรุปรายละเอียด Entity, Primary Key, Foreign Key และ Attribute

| Entity                | Primary Key (PK) | Foreign Key (FK)                                   | Attributes อื่นๆ                                                                              | หน้าที่ในระบบ                                                                         |
| :-------------------- | :--------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **`BRANCHES`**        | `id`             | —                                                  | `name`, `address`                                                                             | จัดเก็บข้อมูลสาขาของร้านกาแฟ (รองรับระบบ Multi-branch)                                |
| **`CATEGORIES`**      | `id`             | —                                                  | `name`, `sort_order`                                                                          | แยกประเภทเมนู (กาแฟ, ชา, ปั่น, เบเกอรี่) รองรับ 3NF                                   |
| **`PRODUCTS`**        | `id`             | `category_id` → `CATEGORIES`                       | `name`, `base_price`, `image_url`, `is_active`                                                | เก็บข้อมูลเมนูสินค้าและราคาฐาน (รองรับ Soft delete ผ่าน is_active)                    |
| **`PRODUCT_OPTIONS`** | `id`             | —                                                  | `option_type`, `name`, `extra_price`                                                          | ตัวเลือกขนาด/ความหวาน/ท็อปปิง รวมในตาราง Single ตาม option_type                       |
| **`ORDERS`**          | `id`             | `branch_id` → `BRANCHES`                           | `branch_id`, `order_no`, `queue_no`, `total_amount`, `payment_method`, `status`, `created_at` | หัวออเดอร์หลัก เก็บยอดรวม วิธีชำระ สถานะคิว และสาขาที่สั่ง                            |
| **`ORDER_ITEMS`**     | `id`             | `order_id` → `ORDERS`<br>`product_id` → `PRODUCTS` | `quantity`, `unit_price`, `subtotal`, `options_json`                                          | Associative Entity แก้ M:N ระหว่าง ORDERS-PRODUCTS เก็บ Snapshot ราคาและตัวเลือก JSON |

---

## 3. รายละเอียดความสัมพันธ์และ Cardinality

1. **`CATEGORIES` (1) — (N) `PRODUCTS` (One-to-Many):**  
   หนึ่งหมวดหมู่มีเมนูได้หลายรายการ แต่ละเมนูจัดอยู่ในหมวดหมู่เดียว

2. **`PRODUCTS` (1) — (N) `ORDER_ITEMS` (One-to-Many / Aggregation):**  
   เมนูหนึ่งรายการสามารถถูกสั่งในออเดอร์ต่างๆ ได้หลายครั้ง

3. **`PRODUCT_OPTIONS` (1) — (N) `ORDER_ITEMS` (One-to-Many):**  
   ตัวเลือกหนึ่งรายการ (เช่น ขนาด M) สามารถถูกเลือกในออเดอร์ได้หลายรายการ โดยเก็บเป็น JSON (`options_json`) ใน order_items

4. **`ORDERS` (1) — (N) `ORDER_ITEMS` (One-to-Many / Composition):**  
   หนึ่งออเดอร์ประกอบด้วยรายการสินค้าหลายรายการ ลบออเดอร์แล้ว order_items ถูกลบตาม (`ON DELETE CASCADE`)

---

## 4. เหตุผลในการออกแบบที่สำคัญ

- **`PRODUCT_OPTIONS` เก็บรวมกัน 1 ตาราง**: ใช้ `option_type` แบ่งระหว่าง `size`, `sweetness`, `topping` แทนการสร้าง 3 ตารางแยก เพื่อลดความซับซ้อนและง่ายต่อการ Query
- **`options_json` ใน ORDER_ITEMS**: เก็บตัวเลือกที่เลือกเป็น JSON แทนการ JOIN ตาราง เพื่อรองรับกรณีตัวเลือกหลายรายการ (toppings หลายอย่าง) และ Snapshot ณ เวลาสั่งซื้อ
- **`unit_price` Snapshot**: เก็บราคา ณ เวลาที่สั่งซื้อ ไม่อ้างอิง `base_price` ปัจจุบัน เพื่อป้องกัน Update Anomaly เมื่อเจ้าของปรับราคาในภายหลัง
- **`is_active`**: ซ่อนเมนูแทนการลบ เพื่อรักษาความสมบูรณ์ของข้อมูลออเดอร์เดิม (Referential Integrity)
