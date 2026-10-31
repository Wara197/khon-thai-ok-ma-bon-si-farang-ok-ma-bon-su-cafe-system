# Software Requirements Specification ตามระบบที่พัฒนาแล้ว

**โครงการ:** Coffee Shop POS
**ชนิดเอกสาร:** SRS as-built ฉบับตรวจจาก source
**วันตรวจ:** 19 ตุลาคม 2026
**ข้อกำหนดต้นทาง:** [wk03](./wk03-requirements.md), [User Stories](./wk04-user-stories.md)

> เอกสารนี้แยกข้อกำหนดเดิมออกจากสิ่งที่ implement แล้ว คำว่า “ทำงาน” หมายถึงพบเส้นทางใน source ไม่ได้ยืนยันผล performance หรือผลทดสอบใช้งานจริง

## 1. วัตถุประสงค์และขอบเขต

ระบบให้แคชเชียร์สร้างออเดอร์และใบเสร็จ ให้บาริสต้าดู/ปรับสถานะคิว และให้เจ้าของร้านดูรายงาน จัดการเมนู คลัง และบัญชีพนักงาน ระบบเป็นเว็บแอป React/Vite ต่อกับ Express REST API และ SQLite ที่ `backend/cafe_pos.db`

## 2. Actors และสิทธิ์

มีบัญชีสามบทบาท `cashier`, `barista`, `owner`; backend ตรวจ session และ role ใน API ก่อนให้บริการ route ที่ป้องกัน เจ้าของร้านสามารถสร้าง/ปิดบัญชีและ reset รหัสผ่านพนักงานได้

## 3. Functional Requirements และสถานะ

| ID                   | ความต้องการปัจจุบันตาม implementation                                                                         | สถานะ/หลักฐาน                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01                | ดึงหมวดหมู่ เมนูเปิดขาย และ options                                                                           | ทำงาน: `GET /api/products`, `Product.findAllActive()`                                                                                                                                                                              |
| FR-02                | เลือกประเภทเครื่องดื่ม ขนาด ความหวาน ท็อปปิง; เบเกอรี่เลือกวิธีรับ                                            | ทำงาน: `CustomizationModal.jsx`; option values มาจาก `product_options`                                                                                                                                                             |
| FR-03                | ปฏิเสธ cart ว่าง, payment method ที่ไม่รองรับ, product/quantity ไม่ถูกต้อง และตัวเลือกที่จำเป็นของเครื่องดื่ม | ทำงาน: `orderController.createOrder()` ตรวจ temperature/size/sweetness และชนิดของ option                                                                                                                                           |
| FR-04                | สร้าง order number และ queue number                                                                           | ทำงาน: `POS-YYYYMMDD-BB-XXXX`; สร้าง/จองคิวแยกสาขาภายใน SQLite `BEGIN IMMEDIATE` transaction                                                                                                                                       |
| FR-05                | คิดราคาและรวมจำนวน                                                                                            | ทำงาน: base + temperature + size + toppings หรือ bakery option, คูณ quantity และหักส่วนลดจำนวนเงินบาท; ไม่มี tax                                                                                                                   |
| FR-06                | บันทึกวิธีชำระ cash/transfer/qr                                                                               | ทำงานเฉพาะการบันทึกชนิดที่เลือก; ไม่มี payment gateway/ผลยืนยันการโอน                                                                                                                                                              |
| FR-07                | แสดงออเดอร์บนคิวบาริสต้า                                                                                      | ทำงานผ่าน polling ทุก 3 วินาที; ไม่มี WebSocket                                                                                                                                                                                    |
| FR-08                | เปลี่ยน `pending`, `cooking`, `ready`, `completed` และยกเลิกบางสถานะ                                          | ทำงาน: อนุญาตเฉพาะขั้นถัดไป; DELETE ยกเลิกได้เฉพาะ pending/cooking                                                                                                                                                                 |
| FR-09                | ตัดสต็อก/เตือนของใกล้หมด                                                                                      | ทำงาน: สูตร `base` หรือ override ตาม size/temperature/sweetness/bakery option; seed น้ำตาลตามระดับหวาน; รับเข้า/ปรับยอด/movements และตัด/คืนใน transaction; Owner จัดการ ส่วน Barista อ่าน stock/threshold/low-stock ได้อย่างเดียว |
| FR-10                | รายงานตามสาขาและช่วงเวลา                                                                                      | ทำงานบางส่วน: ยอดขาย/เปรียบเทียบ/ชำระ/top 5/รายการล่าสุด; queue stats บางส่วนเป็นทุกช่วงเวลา และ ledger จำกัด 50 records                                                                                                           |
| FR-11                | จัดการเมนู                                                                                                    | ทำงาน: เพิ่ม/แก้ไข/soft delete; ตั้ง base price, หมวด, ชื่อ, รูป; ไม่มี base price ต่อ size                                                                                                                                        |
| FR-12                | อัปโหลดรูปเมนู                                                                                                | ทำงานผ่าน base64 endpoint แต่ไม่ยืนยัน MIME จากเนื้อหาไฟล์                                                                                                                                                                         |
| FR-13                | เข้าสู่ระบบและบังคับสิทธิ์ตาม role                                                                            | ทำงาน: scrypt password hash, SHA-256 session token, HttpOnly SameSite=Lax cookie อายุ 12 ชั่วโมง, role guard ที่ API; owner จัดการบัญชีพนักงาน                                                                                     |
| FR-14 (เพิ่มภายหลัง) | บาริสต้าเห็นสูตรวัตถุดิบที่ใช้ตัดสต็อกบนการ์ดคิว และอ่านคำแนะนำเสริมของเมนูได้                                | ทำงาน: ตอนสร้างออเดอร์ snapshot วัตถุดิบ/หน่วย/ปริมาณจริงลง `order_items.options_json`; QueueCard แสดงสูตรจาก snapshot; `products.preparation_instructions` เป็นข้อความเสริมที่ snapshot แยกต่างหาก; สูตรไม่ถูกสร้างซ้ำในหน้าคิว   |

## 4. ข้อกำหนดส่วนต่อประสาน

### 4.1 หน้าจอ

- **Cashier:** หมวด/เมนู, customization modal, cart, payment choice, receipt modal และ browser print.
- **Barista:** filter สาขา, การ์ดคิว `pending/cooking/ready` พร้อมตัวเลือกและสูตรวัตถุดิบจาก snapshot; คำแนะนำเพิ่มเติมแสดงแยก; action เปลี่ยนสถานะและยกเลิกเฉพาะคิวที่ยังยกเลิกได้; เปิด stock overview แบบ read-only ได้.
- **Owner Analytics:** branch/period filters (`today`, `7d`, `30d`, `all`), KPI รายงาน, queue status, recent-order search/status filters, sales/payment/top products.
- **Login:** ชื่อผู้ใช้/รหัสผ่าน; หน้าจอหลักและ API ที่เห็นขึ้นกับ role.
- **Owner Staff:** เพิ่มพนักงาน, กำหนด role, เปิด/ปิดบัญชี และตั้งรหัสผ่านใหม่.
- **Menu Manager:** ค้นหา/กรองเมนูและ CRUD ตามขอบเขตใน FR-11; owner เพิ่ม/แก้คำแนะนำวิธีชงได้ไม่เกิน 2,000 ตัวอักษรต่อเมนู.

Wireframe เป็นแบบที่เสนอไว้และอาจไม่เท่ากับ UI ปัจจุบันทุกจุด ดูความต่างที่บันทึกใน `wk10-wireframe.md`.

### 4.2 REST API

| Method              | Endpoint                                                                     | ผลลัพธ์หลัก                                                               |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GET                 | `/api/products`                                                              | categories + active products (รวม `preparation_instructions`) + options   |
| GET                 | `/api/categories`, `/api/branches`                                           | รายการหมวด/สาขา                                                           |
| POST                | `/api/upload`                                                                | URL รูปที่บันทึก                                                          |
| POST / PUT / DELETE | `/api/products`, `/api/products/:id`                                         | สร้าง/แก้ไข/ซ่อนเมนู; POST/PUT รับ `preparationInstructions` แบบ optional |
| POST                | `/api/orders`                                                                | สร้างหัวออเดอร์และรายการ                                                  |
| GET                 | `/api/orders/queue`, `/api/orders/queue/stats`                               | รายการคิว/สรุปจำนวน; รองรับ `branchId`                                    |
| PATCH / DELETE      | `/api/orders/:id/status`, `/api/orders/:id`                                  | เปลี่ยนสถานะ/ยกเลิก                                                       |
| GET                 | `/api/reports/sales`, `/api/orders/report`                                   | รายงาน; รองรับ `branchId`, `period`                                       |
| GET                 | `/api/inventory`                                                             | owner อ่านรายการ/สูตร/movements; barista อ่านเฉพาะ stock overview         |
| POST / PUT          | `/api/inventory`, `/api/inventory/:id`, `/api/inventory/:id/receive`         | owner เพิ่ม/ปรับ/รับวัตถุดิบ                                              |
| PUT / DELETE        | `/api/recipes`, `/api/recipes/:productId/:inventoryId/:optionType/:optionId` | owner เพิ่ม/ปรับ/ลบสูตร; รองรับ option type `sweetness`                   |
| POST / GET          | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`                        | เข้าสู่ระบบ/ดูบัญชีปัจจุบัน/ออกจากระบบ                                    |
| GET / POST          | `/api/users`                                                                 | owner ดูหรือเพิ่มบัญชี                                                    |
| PATCH               | `/api/users/:id/branch`, `/api/users/:id/active`, `/api/users/:id/password`  | owner กำหนดสาขาพนักงาน เปิด/ปิดบัญชี หรือ reset password                  |

## 5. Data Requirements

Runtime schema มี 14 ตาราง รวม `inventory_stock` สำหรับสต็อกแยกสาขา, `users` และ `sessions` สำหรับ role/session; บัญชีพนักงานมี `branch_id` ประจำสาขา. ราคาเป็น integer บาท; `products.preparation_instructions` เก็บวิธีชงปัจจุบันของเมนู ขณะที่ตัวเลือก วิธีชง ณ เวลาสั่ง และ snapshot วัตถุดิบที่ใช้ถูกเก็บใน `order_items.options_json`. DDL ที่ startup สร้างอยู่ใน `backend/db.js`; `backend/schema.sql` เป็น reference copy ไม่ได้ถูก execute ตอน startup.

## 6. Constraints และคุณภาพที่ยังไม่ยืนยัน

- Backend ใช้ SQLite ในปัจจุบัน; `mysql2` ไม่ได้ถูกใช้โดย `db.js`.
- Order, item และ stock deduction อยู่ใน SQLite transaction เดียวกัน; cancel จะคืนตาม consumption snapshot ของบิล.
- Session อยู่ได้ 12 ชั่วโมงและ login จำกัดความถี่ต่อ IP; ยังไม่มี MFA, password recovery หรือ audit log.
- บัญชีเจ้าของร้านแรกต้องสร้างผ่าน `cd backend && npm run create-user -- --username owner --role owner`; ไม่มีรหัสผ่านตั้งต้นใน source.
- CORS อนุญาต localhost สำหรับ dev และ origin ที่ระบุใน `FRONTEND_ORIGIN`.
- การทดสอบ time-to-load, latency, SUS, browser/device compatibility และ accessibility ต้องวัดแยก ไม่มีหลักฐานจาก source code เพียงอย่างเดียว.
- Test plan ไม่ใช่ผลผ่าน; สถานะการ execute ล่าสุดอยู่ใน `wk13-test-cases.md`.

อ่านหน้าที่ของ source module ทั้งหมดใน [code tour](./code-tour.md); รายละเอียด API response และ schema ที่ runtime ใช้อยู่ใน [as-built report](./as-built-reverse-engineering.md).

## 7. Source Traceability

| พื้นที่          | Source                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| Startup / schema | `backend/server.js`, `backend/db.js`                                                 |
| API boundary     | `backend/routes/productRoutes.js`, `backend/routes/orderRoutes.js`                   |
| Business logic   | `backend/controllers/productController.js`, `backend/controllers/orderController.js` |
| SQL queries      | `backend/entities/*.js`                                                              |
| UI/API client    | `frontend/src/components/`, `frontend/src/services/api.js`                           |
