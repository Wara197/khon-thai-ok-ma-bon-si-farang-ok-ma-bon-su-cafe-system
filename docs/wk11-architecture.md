# wk11-architecture.md: สถาปัตยกรรมระบบ Coffee Shop POS

**รายวิชา:** 88734065 การวิเคราะห์และออกแบบระบบ  
**กิจกรรม:** Workshop สัปดาห์ที่ 11 — Architecture View

> **หมายเหตุ:** เอกสารนี้สร้างขึ้นโดย Reverse Engineering จากโค้ดจริงที่พัฒนาแล้ว

---

## 1. Physical View

ระบบ Coffee Shop POS รันเป็น **Monolithic Single-Process** บนเครื่องเดียว:

- **Client:** เบราว์เซอร์ (Chrome บน PC / Tablet ≥ 768px ตาม NFR-04)
- **Backend Server:** Node.js + Express รันที่ Port **3000**
  - Serve React SPA จาก `/frontend/dist/` (Static Files)
  - ให้บริการ REST API ที่ `/api/*`
- **Database:** **SQLite** (`cafe_pos.db`) อยู่ในโฟลเดอร์เดียวกับ `server.js`
  - ใช้ WAL Mode เพื่อประสิทธิภาพ
  - รองรับการเปลี่ยนเป็น MySQL ผ่าน `schema.sql` (Migration-ready)

```
[Browser / Tablet]
      |  HTTP (port 3000)
      v
[Node.js + Express Server - port 3000]
  ├── Static: /frontend/dist/  (React SPA)
  └── API:    /api/*           (REST Endpoints)
               |
               v
        [SQLite: cafe_pos.db]
          ├── categories
          ├── products
          ├── product_options
          ├── orders
          └── order_items
```

---

## 2. Development View (BCM Layered Architecture)

โครงสร้างโค้ดแบ่งตาม **Boundary-Control-Entity (BCM)** Pattern อย่างชัดเจน:

```
project/
├── backend/                          ← Node.js Backend
│   ├── server.js                     ← Entry Point (Express setup, DB init, SPA serve)
│   ├── db.js                         ← Database Layer (SQLite Promise wrapper + Auto-setup)
│   ├── schema.sql                    ← MySQL Migration Schema
│   ├── routes/                       ← <<boundary>> Layer (HTTP Interface)
│   │   ├── productRoutes.js          ←   GET  /api/products
│   │   └── orderRoutes.js            ←   POST /api/orders
│   │                                 ←   GET  /api/orders/queue
│   │                                 ←   PATCH /api/orders/:id/status
│   │                                 ←   DELETE /api/orders/:id
│   ├── controllers/                  ← <<control>> Layer (Business Logic)
│   │   ├── productController.js      ←   จัดกลุ่มเมนู, แปลงราคา
│   │   └── orderController.js        ←   Validate (FR-03), คำนวณราคา (FR-05),
│   │                                 ←   ออกเลขคิว (FR-04), ตรวจสถานะ (FR-08)
│   └── entities/                     ← <<entity>> Layer (Data Access)
│       ├── Product.js                ←   findAllActive(), findById()
│       ├── ProductOption.js          ←   findAll(), findById(), findByIds()
│       └── Order.js                  ←   create(), createItem(), findQueue(),
│                                     ←   findById(), updateStatus()
│
└── frontend/                         ← React + Vite SPA
    └── src/
        ├── App.jsx                   ← Main container + Tab switcher (Cashier/Barista)
        ├── services/
        │   └── api.js                ← REST Client (fetch wrapper)
        └── components/
            ├── Navbar.jsx            ← Navigation + Queue count badge
            ├── cashier/              ← Cashier Screen (FR-01 to FR-06)
            │   ├── CashierView.jsx   ←   Main layout + state management
            │   ├── CategoryTabs.jsx  ←   Filter menu by category
            │   ├── ProductGrid.jsx   ←   Product card grid
            │   ├── ProductCard.jsx   ←   Single product display
            │   ├── CustomizationModal.jsx ← Size/Sweetness/Topping selector
            │   ├── CartSidebar.jsx   ←   Cart + payment selection
            │   └── ReceiptModal.jsx  ←   Receipt + queue number display
            └── barista/              ← Barista Screen (FR-07 to FR-08)
                ├── BaristaView.jsx   ←   Queue list + auto-polling (3s)
                └── QueueCard.jsx     ←   Order card + status update button
```

---

## 3. สรุปสถาปัตยกรรม (Monolithic + BCM Layered)

ระบบใช้ **Monolithic Architecture** เนื่องจาก:

1. **ขนาดโครงการเหมาะสม**: เป็นระบบ POS สาขาเดียว ไม่จำเป็นต้องแยก Microservices
2. **Deploy ง่าย**: รันด้วยคำสั่งเดียว (`npm start`) เหมาะสำหรับร้านกาแฟขนาดเล็ก-กลาง
3. **ทีมขนาดเล็ก**: Monolithic เหมาะกับทีม 3-5 คนที่ทำงานร่วมกัน

กฎการแบ่ง Layer:

- **Boundary** (`routes/`) — รับ HTTP เท่านั้น ห้ามมี Logic
- **Control** (`controllers/`) — Business Logic, Validation, การคำนวณ
- **Entity** (`entities/`) — SQL คำสั่งเท่านั้น ห้ามมี Business Logic
- **Database** (`db.js`) — Connection wrapper, Auto-setup, Seed data
