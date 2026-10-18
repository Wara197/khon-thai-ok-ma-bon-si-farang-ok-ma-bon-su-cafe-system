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
[Browser / Tablet (Chrome)]
      |  HTTP (port 3000)
      v
[Node.js + Express Server - port 3000]
  ├── Static: /frontend/dist/  (React SPA Production Bundle)
  ├── Static: /uploads/        (Uploaded Product Images - Multer storage)
  └── API:    /api/*           (REST Endpoints)
               |
               v
        [SQLite: cafe_pos.db (WAL Mode)]
          ├── branches          (Multi-Branch Data: 3 สาขา)
          ├── categories        (Product Categories)
          ├── products          (Menu Items + Image URLs + is_active)
          ├── product_options   (Size, Sweetness, Toppings)
          ├── orders            (Orders + branch_id + payment_method + status)
          └── order_items       (Order Items Snapshot + options_json)
```

---

## 2. Development View (BCM Layered Architecture)

โครงสร้างโค้ดแบ่งตาม **Boundary-Control-Entity (BCM)** Pattern อย่างเคร่งครัด:

```
project/
├── backend/                          ← Node.js + Express Backend
│   ├── server.js                     ← Entry Point (Express setup, DB init, Static serve, SPA fallback)
│   ├── db.js                         ← Database Layer (SQLite Promise wrapper + Auto-migration & Seeding)
│   ├── schema.sql                    ← Production Database Schema (MySQL/SQLite Compatible)
│   ├── public/uploads/               ← Static Uploaded Product Images
│   ├── routes/                       ← <<boundary>> Layer (HTTP Interface)
│   │   ├── productRoutes.js          ←   POST /api/upload
│   │   │                             ←   GET  /api/products
│   │   │                             ←   GET  /api/categories
│   │   │                             ←   POST /api/products
│   │   │                             ←   PUT  /api/products/:id
│   │   │                             ←   DELETE /api/products/:id
│   │   └── orderRoutes.js            ←   POST /api/orders
│   │                                 ←   GET  /api/orders/queue
│   │                                 ←   PATCH /api/orders/:id/status
│   │                                 ←   DELETE /api/orders/:id
│   │                                 ←   GET  /api/reports/sales
│   │                                 ←   GET  /api/branches
│   ├── controllers/                  ← <<control>> Layer (Business Logic & Validation)
│   │   ├── productController.js      ←   จัดกลุ่มเมนู, จัดการ CRUD เมนูสินค้าและราคา (FR-01, FR-04)
│   │   └── orderController.js        ←   Validate (FR-03), คำนวณราคา (FR-05), ออกเลขคิว (FR-04),
│   │                                 ←   ตรวจลำดับสถานะ (FR-08), สรุปรายงานยอดขายตามสาขา (FR-05)
│   └── entities/                     ← <<entity>> Layer (Data Access & SQL Querying)
│       ├── Branch.js                 ←   findAll(), findById() (ตาราง branches)
│       ├── Category.js               ←   findAll(), findById() (ตาราง categories)
│       ├── Product.js                ←   findAllActive(), findById(), create(), update(), delete()
│       ├── ProductOption.js          ←   findAll(), findById(), findByIds()
│       └── Order.js                  ←   create(), createItem(), findQueue(), findById(),
│                                     ←   updateStatus(), getSalesReport()
│
└── frontend/                         ← React 19 + Vite SPA (Client Layer)
    └── src/
        ├── App.jsx                   ← Main Container, Role Switcher (Cashier/Barista/Owner) & State
        ├── App.css                   ← Coffee-themed Design System (Espresso & Amber, Custom Dropdowns)
        ├── services/
        │   └── api.js                ← REST Client (Axios/Fetch wrapper สำหรับทุก API endpoint)
        └── components/
            ├── Navbar.jsx            ← Top Navigation + Custom Branch Switcher + Clock
            ├── cashier/              ← Cashier Ordering Screen (FR-01 to FR-06)
            │   ├── CashierView.jsx   ←   Main POS Layout, Category Filters, Search
            │   ├── CategoryTabs.jsx  ←   Filter products by Category
            │   ├── ProductGrid.jsx   ←   Responsive Menu Grid Display
            │   ├── ProductCard.jsx   ←   Product Card with Image & Price
            │   ├── CustomizationModal.jsx ← Drink Options (Size S/M/L, Temp, Sweetness, Toppings)
            │   ├── CartSidebar.jsx   ←   Cart Management, Payment Selection (Cash/QR/Transfer)
            │   └── ReceiptModal.jsx  ←   Printable Receipt with Unique Queue Ticket
            ├── barista/              ← Barista Queue Screen (FR-07 to FR-08)
            │   ├── BaristaView.jsx   ←   Live Queue Kanban Board + Branch Filter + Auto-polling (3s)
            │   └── QueueCard.jsx     ←   Order Ticket Card with Status Transition Controls
            └── owner/                ← Owner Analytics & Management (FR-04, FR-05, Use Case 07-08)
                ├── OwnerView.jsx     ←   Sales Overview, Revenue KPIs, Top Products Chart, Order History
                └── MenuManager.jsx   ←   Menu & Pricing CRUD, Category Select, Multer Image Upload
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
