# Sequence Diagrams ตามคำขอจริงใน Source

**สัปดาห์:** 09 — System Sequence / BCM Flow
**รายละเอียดประกอบ:** [as-built reverse-engineering](./as-built-reverse-engineering.md)

## 1. โหลดเมนู

```mermaid
sequenceDiagram
  actor Cashier
  participant UI as CashierView
  participant API as GET /api/products
  participant Controller as productController
  participant DB as SQLite entities
  Cashier->>UI: เปิดหน้าขาย
  UI->>API: fetchProducts()
  API->>Controller: listProducts()
  Controller->>DB: categories, active products, all options
  DB-->>Controller: rows
  Controller-->>API: grouped categories + options
  API-->>UI: JSON
  UI-->>Cashier: แสดงหมวด/สินค้า/ตัวเลือก
```

## 2. สร้างออเดอร์และอ่านคิว

```mermaid
sequenceDiagram
  actor Cashier
  participant UI as CashierView / CartSidebar
  participant Route as POST /api/orders
  participant Controller as orderController
  participant Entities as Product / ProductOption / Inventory / Order
  participant DB as SQLite
  participant Barista as BaristaView
  Cashier->>UI: เลือกสินค้า, options, payment method
  UI->>Route: items + paymentMethod + branchId
  Route->>Controller: createOrder(data)
  Controller->>Entities: load product (including preparation instructions), validate options and calculate price
  Controller->>DB: BEGIN IMMEDIATE transaction
  Controller->>Entities: load matching recipe rules and stock
  Entities->>DB: SELECT product/options/recipe rules/stock
  DB-->>Entities: rows
  Controller->>Controller: validate inventory availability, snapshot usage
  Controller->>Controller: add preparation instructions to item options snapshot
  Controller->>Entities: get next queue, create order + line items
  Entities->>DB: INSERT orders and order_items
  Controller->>DB: decrement inventory and insert movements
  Controller->>DB: COMMIT
  Controller-->>UI: 201 order number, queue number, amount, status
  UI-->>Cashier: show receipt; optional browser print
  loop every 3 seconds
    Barista->>Route: GET /api/orders/queue?branchId=...
    Route->>DB: read order_items.options_json snapshots
    DB-->>Route: selected options and preparation instructions
    Route-->>Barista: pending/cooking/ready orders and item instructions
  end
```

หาก validation, stock check หรือการเขียนรายการใดล้มเหลว transaction จะ rollback การจองคิว, order, items และ stock movement พร้อมกัน.

ตอนสร้างออเดอร์ ระบบคัดลอกชื่อวัตถุดิบ หน่วย และปริมาณที่จับคู่ได้จากสูตรจริงไปไว้ใน `options_json.inventoryConsumptions` พร้อม snapshot ตัวเลือก; QueueCard ใช้ข้อมูลชุดนี้แสดงสูตรให้บาริสต้า และไม่คำนวณจากสูตรปัจจุบันซ้ำเมื่ออ่านคิว. คำแนะนำข้อความจาก `products.preparation_instructions` เป็นข้อมูลเสริมและแสดงแยกจากสูตรตัดสต็อก.

## 3. อัปเดตสถานะหรือยกเลิก

```mermaid
sequenceDiagram
  actor Barista
  participant UI as QueueCard
  participant Route as orderRoutes
  participant Controller as orderController
  participant Order as Order entity
  Barista->>UI: กด action ของสถานะถัดไป
  UI->>Route: PATCH /api/orders/:id/status {status}
  Route->>Controller: updateStatus(id,status)
  Controller->>Order: findById(id)
  Controller->>Controller: ตรวจว่าสถานะเป็นขั้นถัดไปพอดี
  alt สถานะถัดไปถูกต้อง
    Controller->>Order: updateStatus(id,status)
    Controller-->>UI: 200 updated status
  else invalid, same, backward, or skipped
    Controller-->>UI: 400 error
  end
  opt pending/cooking and user confirms cancel
    UI->>Route: DELETE /api/orders/:id
    Route->>Controller: cancelOrder(id)
    Controller->>Order: load item snapshots and updateStatus(id,cancelled)
    Controller->>DB: restore inventory and insert movements in transaction
  end
```

Backend ยอมให้เปลี่ยนไปสถานะถัดไปทีละหนึ่งขั้นเท่านั้น; cancellation ทำได้เฉพาะ pending/cooking และคืน stock ตาม `inventoryConsumptions` snapshot ของ order item.

## 4. Owner report refresh

```mermaid
sequenceDiagram
  participant UI as OwnerView
  participant Sales as GET /api/reports/sales
  participant Stats as GET /api/orders/queue/stats
  participant Order as Order entity
  participant DB as SQLite
  UI->>Sales: branchId + period on load/filter/manual refresh
  Sales->>Order: getSalesReport(branchId,period)
  Order->>DB: aggregate sales, completed, payments, top products, latest 50 orders
  DB-->>UI: report object
  loop every 60 seconds
    UI->>Sales: refresh report
  end
  loop every 5 seconds
    UI->>Stats: refresh current queue counts
    Stats->>Order: getQueueStats(branchId)
  end
```

ตัวเลข queue summary เป็น polling แยกจาก sales report. ไม่ใช่ WebSocket หรือ push update

## 5. Barista อ่าน stock overview

```mermaid
sequenceDiagram
  actor Barista
  participant UI as BaristaView
  participant Route as GET /api/inventory
  participant Auth as authenticate + requireRoles
  participant Controller as inventoryController.listStockOverview
  participant Inventory as Inventory.findStockOverview
  participant DB as SQLite
  Barista->>UI: เปิดแผงเช็คสต็อก
  UI->>Route: fetchInventory()
  Route->>Auth: session role check (owner/barista)
  Auth->>Controller: barista stock overview
  Controller->>Inventory: select stock fields
  Inventory->>DB: SELECT id/name/stock/min_threshold/unit
  DB-->>UI: items + lowStock
  loop ทุก 30 วินาทีขณะเปิดแผง
    UI->>Route: GET /api/inventory
  end
  Note over Barista,Route: POST/PUT/receive/recipe endpoints อนุญาต owner เท่านั้น
```
