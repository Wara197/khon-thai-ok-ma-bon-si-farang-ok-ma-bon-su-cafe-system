# เอกสารระบบตามการทำงานจริง

**โครงการ:** Coffee Shop POS  
**จุดประสงค์:** บันทึกพฤติกรรมและโครงสร้างที่ตรวจพบในซอร์สโค้ด เพื่อใช้เทียบและปรับเอกสารสะสมตามแนวทางสัปดาห์ที่ 15  
**ขอบเขตการตรวจ:** `project/backend/` และ `project/frontend/src/` ณ 19 ตุลาคม 2026

> เอกสารนี้อธิบายสิ่งที่โค้ดปัจจุบันทำได้ ไม่ใช่เป้าหมายจาก requirement หรือผลทดสอบที่ยังไม่มีหลักฐาน โค้ดอ้างอิงหลักคือ `backend/db.js`, `backend/server.js`, `backend/routes/`, `backend/controllers/`, `backend/entities/` และ `frontend/src/components/` หากโค้ดเปลี่ยน เอกสาร as-built ต้องตรวจและปรับตามอีกครั้ง

## 1. สรุปภาพระบบ

ระบบเป็นเว็บแอป React 19 + Vite ติดต่อ REST API ที่สร้างด้วย Node.js และ Express ใช้ SQLite จาก `sqlite3` เป็นฐานข้อมูลขณะทำงาน เซิร์ฟเวอร์สร้าง schema และ seed ข้อมูลเมื่อเริ่มระบบ จากนั้นให้บริการ API, ไฟล์อัปโหลด และไฟล์ frontend ที่ build แล้ว

ระบบมี login และจำกัดสิทธิ์ตามบทบาท แคชเชียร์สร้างรายการขาย, บาริสต้าติดตามคิวและตรวจยอดวัตถุดิบแบบอ่านอย่างเดียว และเจ้าของร้านดูรายงาน/จัดการเมนู/คลัง/บัญชีพนักงาน

## 2. เทคโนโลยีและการเริ่มระบบ

| ส่วน | สิ่งที่ใช้จริง |
|---|---|
| Frontend | React 19, Vite, JavaScript, CSS, `lucide-react` |
| Backend | Node.js, Express 4, `sqlite3`, `cors`, `dotenv` |
| Database ขณะทำงาน | SQLite ไฟล์ `backend/cafe_pos.db`; ตั้งค่า WAL ใน `db.setup()` |
| ค่าเริ่มต้น | `PORT` จาก environment หรือ 3000; ไม่มีตัวเลือก DB dialect ใน `db.js` |
| การเชื่อมต่อหน้าเว็บ | Vite proxy `/api` ไป backend ระหว่าง dev; Express serve `frontend/dist` เมื่อ deploy แบบ server เดียว |
| Authentication | รหัสผ่าน scrypt, opaque session token เก็บเป็น SHA-256 hash ใน SQLite, HttpOnly SameSite=Lax cookie อายุ 12 ชั่วโมง |

`mysql2` ยังอยู่ใน dependencies แต่ source ที่เปิดฐานข้อมูลจริงคือ `backend/db.js` ซึ่งใช้ `sqlite3` โดยตรง ส่วน `backend/schema.sql` เป็นสคริปต์แยกและไม่ได้ถูกเรียกโดย startup ปัจจุบัน จึงไม่ใช่ schema ที่ยืนยันจาก runtime

## 3. ขอบเขตความสามารถและสถานะ requirement

| รหัส/ความสามารถ | สถานะจาก source | รายละเอียดที่ตรวจพบ |
|---|---|---|
| FR-01 แสดงเมนู | ทำงาน | `GET /api/products` คืนหมวดหมู่ เมนูที่ `is_active=1` และตัวเลือก; seed มี 4 หมวดและ 10 เมนู |
| FR-02 ปรับแต่งสินค้า | ทำงานบางส่วนตามชนิดสินค้า | เครื่องดื่มเลือกประเภท ร้อน/เย็น/ปั่น, ขนาด, ความหวาน, ท็อปปิง; เบเกอรี่เลือกอุ่นหรือรับปกติ |
| FR-03 ตรวจข้อมูลก่อนสั่ง | ทำงาน | API ต้องมีรายการ วิธีชำระ และข้อมูลสินค้า/จำนวน; บังคับ size สำหรับสินค้าที่ระบบจำแนกว่าไม่ใช่เบเกอรี่; ฝั่ง UI ตรวจประเภทและขนาดเครื่องดื่ม |
| FR-04 เลขออเดอร์/คิว | ทำงาน | เลขออเดอร์รูปแบบ `POS-YYYYMMDD-BB-XXXX`; ใช้ `BEGIN IMMEDIATE` อ่านและจองเลขคิวแยกสาขาใน transaction เดียวกับการสร้างบิล |
| FR-05 คำนวณราคา | ทำงาน | ราคาต่อหน่วย = ฐาน + ตัวเลือกประเภทเครื่องดื่ม + ขนาด + ท็อปปิง หรือ option เบเกอรี่; คูณจำนวนแล้วหักส่วนลดจำนวนเงินบาทก่อนบันทึกยอดสุทธิ |
| FR-06 วิธีชำระ | บันทึกวิธีที่เลือก | API ยอมรับ `cash`, `transfer`, `qr`; ไม่พบการเชื่อมต่อธนาคาร/PromptPay หรือการตรวจยืนยันธุรกรรมการเงิน |
| FR-07 ส่งเข้าคิว | ทำงานผ่าน polling | หน้าบาริสต้าดึงคิวทุก 3 วินาที; ไม่มี WebSocket หรือ push event |
| FR-08 สถานะคิว | ทำงาน | อนุญาตเลื่อนไปสถานะถัดไปทีละขั้นเท่านั้น; ยกเลิกได้เฉพาะ `pending` และ `cooking` |
| FR-09 สต็อก | ทำงาน | มีคลัง, สูตรพื้นฐานและสูตรแทนค่าตามขนาด/ประเภท/ความหวาน/วิธีเสิร์ฟ, รับเข้า, ปรับยอด, ประวัติ movement; ตรวจสูตรและสต็อกก่อน order, ตัด/คืนตาม snapshot ใน transaction; Owner เห็น low-stock ใน Analytics/คลัง และ Barista อ่านยอด/threshold/สถานะต่ำได้ |
| FR-10 รายงาน | ทำงานบางส่วน | รายงานยอดขายตามสาขาและช่วง `today`, `7d`, `30d`, `all`, ยอดเปรียบเทียบ, จำนวนเสร็จสิ้น, ช่องทางชำระ, top 5 และรายการล่าสุดสูงสุด 50 รายการ; queue status ในรายงานเป็นยอดรวมทุกช่วงเวลา |
| FR-11 Login และ role access | ทำงาน | บัญชี `owner`, `cashier`, `barista`; session cookie และ middleware บังคับ role แยกตาม API; owner จัดการบัญชี/ปิดใช้งาน/ตั้งรหัสใหม่ | ยังไม่มีการกู้บัญชีด้วยอีเมล, MFA หรือ audit trail การเปลี่ยนสิทธิ์ |
| สูตรบนคิวบาริสต้า (เพิ่มภายหลัง) | ทำงาน | ตอนสร้าง order ระบบ snapshot ชื่อวัตถุดิบ หน่วย และปริมาณที่ใช้ตัดสต็อกจริงลง `order_items.options_json.inventoryConsumptions`; QueueCard แสดงสูตรจาก snapshot; Owner สามารถใส่ `preparation_instructions` เสริมได้แยกจากสูตร | คิวเก่าที่มี snapshot รุ่นก่อนเก็บเฉพาะ ID/ปริมาณจะเติมชื่อและหน่วยจากคลังปัจจุบันโดยรักษาปริมาณใน snapshot; คิวที่ไม่มี consumption snapshot แจ้งว่าไม่มีข้อมูลสูตร |
| จัดการเมนู | ทำงาน | เพิ่ม/แก้ไข/ซ่อนเมนู; ราคาเมนูเป็น base price เดียว ไม่พบการตั้งราคาฐานแยก S/M/L; option ราคาเพิ่มเก็บแยกใน `product_options`; Owner กำหนด `preparation_instructions` ได้สูงสุด 2,000 ตัวอักษรต่อเมนู |
| อัปโหลดรูป | ทำงานตาม endpoint | รับเฉพาะ data URL ของ PNG/JPEG/WEBP/GIF, ตรวจ signature ให้สอดคล้องกับ MIME และจำกัดไฟล์ 15 MB; บันทึก `backend/public/uploads` และพยายามคัดลอกไป `frontend/public/uploads` |

NFR ด้านเวลา, usability, SUS, security และ compatibility เป็นเกณฑ์/ผลที่ต้องวัดแยกจาก source code เอกสารนี้ไม่ถือว่าผ่านเกณฑ์ดังกล่าวจากการอ่านโค้ดเพียงอย่างเดียว

## 4. ผู้ใช้และหน้าจอ

| หน้าจอ | พฤติกรรมตาม source |
|---|---|
| Cashier | โหลดเมนู/ตัวเลือก; เลือกหมวดและสินค้า; ปรับแต่งสินค้า; รวมรายการที่ตัวเลือกเหมือนกัน; ปรับจำนวน/ลบ/ล้างตะกร้า; เลือกวิธีชำระ; ส่ง `branchId`; แสดงใบเสร็จที่พิมพ์ผ่าน browser print |
| Barista | เลือกสาขา; แสดง `pending`, `cooking`, `ready` พร้อมตัวเลือก สูตรวัตถุดิบจาก consumption snapshot และข้อความวิธีชงเสริม; refresh ทุก 3 วินาที; ปุ่มเลื่อนไปสถานะถัดไป; ยกเลิกออเดอร์ได้เฉพาะ pending/cooking; เปิดแผงเช็คสต็อกเพื่ออ่านยอดคงเหลือ/threshold และ refresh ทุก 30 วินาทีขณะแผงเปิด |
| Owner Analytics | เลือกสาขาและช่วงเวลา; โหลดรายงานเมื่อเลือก/รีเฟรชและ poll รายงานทุก 60 วินาที; queue stats poll ทุก 5 วินาที; low stock poll ทุก 60 วินาทีพร้อมลิงก์ไปคลัง; ค้นหา/กรองสถานะในรายการล่าสุด; เปิดดูรายการคิวที่รอทำและ retry เมื่อโหลดผิดพลาด |
| Owner Inventory | เพิ่ม/แก้ไขวัตถุดิบ, รับเข้า/ปรับยอด, ตั้ง threshold, กำหนดสูตรพื้นฐานหรือสูตร override ตาม option, ดู low stock และประวัติ 30 movement ล่าสุด; เมนูที่ไม่มีสูตรที่ตรงกับตัวเลือกจะสั่งขายไม่ได้ |
| Owner Staff | เพิ่มบัญชีพนักงาน, เลือก role, ปิด/เปิดใช้งานบัญชี, reset password; บังคับ owner อย่างน้อยหนึ่งบัญชีที่ยัง active |
| Owner Menu Manager | ค้นหา/กรองเมนู; เพิ่ม/แก้ไข/ซ่อนเมนู; แก้ชื่อ หมวด ราคาฐาน รูปภาพ และวิธีชง; อัปโหลดรูปหรือใส่ URL |

ตัวเลือกสาขาบน Navbar เป็น state ส่วนกลางของจุดขาย/หน้าบาริสต้า ส่วนตัวกรองสาขาใน Owner Analytics เป็น state ของหน้า dashboard แยกกัน

## 5. API ที่ mount จริง

ทุก endpoint อยู่ใต้ `/api` และคืน JSON จาก routes ใน backend:

| Method | Path | หน้าที่/พารามิเตอร์ |
|---|---|---|
| GET | `/api/products` | หมวดหมู่ เมนูที่เปิดขาย และตัวเลือกทั้งหมด |
| GET | `/api/categories` | รายชื่อหมวดหมู่ |
| GET | `/api/branches` | รายชื่อสาขา |
| POST | `/api/upload` | owner-only; รับ data URL PNG/JPEG/WEBP/GIF, ตรวจ signature และจำกัด 15 MB ก่อนบันทึก |
| POST | `/api/products` | เพิ่มเมนู; body ใช้ `categoryId`, `name`, `basePrice`, `imageUrl`, optional `preparationInstructions` (สูงสุด 2,000 ตัวอักษร) |
| PUT | `/api/products/:id` | แก้ไขเมนู; รับ optional `preparationInstructions`; หากไม่ส่ง field จะรักษาค่าเดิม |
| DELETE | `/api/products/:id` | soft delete โดยตั้ง `is_active=0` |
| POST | `/api/orders` | สร้างออเดอร์; body มี `paymentMethod`, `branchId`, `items[]` |
| GET | `/api/orders/queue?branchId=` | รายละเอียดคิวที่ยัง active พร้อม snapshot options/วิธีชง; ไม่ส่ง completed/cancelled |
| GET | `/api/orders/queue/stats?branchId=` | จำนวนคิวแยกสถานะสำหรับ dashboard |
| PATCH | `/api/orders/:id/status` | เปลี่ยนสถานะตามกฎลำดับ |
| DELETE | `/api/orders/:id` | ยกเลิก pending/cooking |
| GET | `/api/reports/sales?branchId=&period=` | รายงานยอดขาย/คิว/ช่องทาง/สินค้า/ออเดอร์ |
| GET | `/api/orders/report?branchId=&period=` | alias ของ sales report |
| GET | `/api/inventory` | owner ได้ items/lowStock/recipes/movements; barista ได้เฉพาะ fields ที่จำเป็นจาก items และ lowStock; ทั้งสอง role อ่านได้ |
| POST | `/api/inventory` | สร้างวัตถุดิบพร้อม stock เริ่มต้น/unit/threshold; owner เท่านั้น |
| PUT | `/api/inventory/:id` | ปรับ stock และ threshold; บันทึก movement เมื่อ stock เปลี่ยน; owner เท่านั้น |
| POST | `/api/inventory/:id/receive` | รับวัตถุดิบเข้า พร้อมหมายเหตุ; owner เท่านั้น |
| PUT | `/api/recipes` | เพิ่ม/ปรับสูตรพื้นฐานหรือสูตรตาม option รวม `sweetness`; owner เท่านั้น |
| DELETE | `/api/recipes/:productId/:inventoryId/:optionType/:optionId` | ลบกฎสูตรเฉพาะรายการ; owner เท่านั้น |
| POST | `/api/auth/login`, `/api/auth/logout` | สร้างและเพิกถอน session cookie; login จำกัดความถี่ต่อ IP |
| GET | `/api/auth/me` | คืนบัญชีที่ผูกกับ session ปัจจุบัน |
| GET / POST | `/api/users` | owner อ่าน/สร้างบัญชีและกำหนด role |
| PATCH | `/api/users/:id/active`, `/api/users/:id/password` | owner เปิด/ปิดบัญชีหรือ reset รหัส; ปิดบัญชี/reset จะเพิกถอน session เดิม |

## 6. Schema ที่สร้างจาก runtime

`db.setup()` สร้าง 13 ตารางด้วย SQLite รวม `product_recipes` legacy สำหรับ migration, `users` และ `sessions`:

| ตาราง | คอลัมน์สำคัญ |
|---|---|
| `branches` | `id`, `name`, `address` |
| `categories` | `id`, `name`, `sort_order` |
| `products` | `id`, `category_id`, `name`, `base_price INTEGER`, `image_url`, `is_active` |
| `product_options` | `id`, `option_type`, `name`, `extra_price INTEGER` |
| `orders` | `id`, `branch_id`, `order_no UNIQUE`, `queue_no`, `total_amount INTEGER`, `discount_amount`, `payment_method`, `payment_status`, `status`, `created_at` |
| `order_items` | `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`, `options_json` |
| `inventory` | `id`, `name UNIQUE`, `stock_qty`, `min_threshold`, `unit` |
| `product_recipes` | สูตรเดิม `(product_id, inventory_id, quantity_per_unit)` ใช้เป็นแหล่งย้ายข้อมูลครั้งเดียว |
| `product_recipe_rules` | `product_id`, `inventory_id`, `option_type`, `option_id`, `quantity_per_unit`; unique ต่อเมนู/วัตถุดิบ/option |
| `inventory_movements` | `inventory_id`, `change_qty`, `reason`, `reference_type/id`, `created_at` |
| `schema_migrations` | migration key สำหรับย้ายสูตรเดิมเข้าตาราง rule |
| `users` | `username`, `password_hash`, `password_salt`, `role`, `is_active` |
| `sessions` | `user_id`, `token_hash`, `expires_at`, `created_at` |

`options_json` เก็บค่า option IDs/names, `isBakery` และ `inventoryConsumptions` ที่ snapshot ตอนสั่ง (วัตถุดิบ/หน่วย/ปริมาณ) เพื่อแสดงสูตรบนคิวและคืนสต็อกให้ตรงแม้มีการแก้สูตรภายหลัง. สำหรับคิวรุ่นเก่าที่ snapshot มีเพียง ID/ปริมาณ ระบบเติมชื่อและหน่วยจาก inventory โดยไม่แทนจำนวนใน snapshot. Seed เพิ่ม `น้ำตาล` แบบ idempotent และสร้างสูตรตัวอย่างตาม sweetness 25/50/75/100% เท่ากับ 3/6/9/12 กรัมต่อแก้ว; 0% ไม่สร้าง consumption rule. ปริมาณเป็นค่าตัวอย่างที่ owner แก้ได้ ไม่ใช่สูตรมาตรฐานของร้าน

การสร้าง order ใช้ `BEGIN IMMEDIATE TRANSACTION` ครอบการตรวจสูตร/stock, สร้างคิว, insert header/items และตัด stock; การยกเลิกครอบการเปลี่ยนสถานะและคืน stock ใน transaction เดียวกัน. `PRAGMA foreign_keys=ON` เปิดใน connection runtime. `orders.branch_id` ยังไม่มี FK ใน DDL runtime

## 7. ลำดับงานจริง

1. หน้าแคชเชียร์เรียก `GET /api/products` และเลือกสินค้า/option ใน browser
2. ตะกร้าคำนวณยอดฝั่ง UI และเลือกวิธีชำระ
3. `POST /api/orders` ตรวจรายการและวิธีชำระ ค้นสินค้า/option แล้วคำนวณราคาใน controller
4. transaction ตรวจสูตรที่ตรงกับ option, ตรวจวัตถุดิบ, จองคิวแยกสาขา, insert `orders`/`order_items` พร้อม snapshot ปริมาณวัตถุดิบ แล้วตัด stock และบันทึก movement
5. หน้า Barista poll `GET /api/orders/queue`; เจ้าของร้านโหลดสรุปคิวผ่าน `/stats`
6. Barista ส่ง `PATCH /api/orders/:id/status`; backend ตรวจสถานะและ update
7. Owner Analytics ดึง sales report แยกตาม branch/period และแสดงตัวเลขกับ ledger

## 8. ข้อจำกัดและความเสี่ยงที่ยืนยันจากโค้ด

- Login จำกัดความถี่ตาม IP; session หมดอายุใน 12 ชั่วโมง และไม่มีระบบกู้บัญชีด้วยอีเมลหรือ MFA
- การเลือก payment method เป็นการบันทึก label ไม่ได้ยืนยันว่ารับเงินจริง
- สูตรเริ่มต้นของข้อมูลตัวอย่างเป็นค่า seed เพื่อสาธิต เจ้าของร้านควรแก้ตามสูตรจริงก่อนใช้งาน; สามารถตั้งสูตรตามขนาด/ประเภท/ความหวาน/วิธีเสิร์ฟได้
- ไม่มี gateway ชำระเงินจริง, tax, payroll, delivery integration หรือบัญชีเต็มรูปแบบ
- SQLite เป็น runtime DB ปัจจุบัน แม้ `mysql2` อยู่ใน dependencies และมี `schema.sql` แยก; ห้ามอ้างว่า runtime สลับฐานข้อมูลได้
- role guard บังคับที่ backend; ยังไม่มี session management UI หรือ audit log ของการเปลี่ยน role/password
- รายงาน sales ใช้ช่วงเวลาที่เลือก แต่ queue counts บางส่วนเป็นจำนวนรวมทุกเวลา; ledger คืนสูงสุด 50 รายการ
- CORS อนุญาต localhost dev และ origin จาก `FRONTEND_ORIGIN`; อัปโหลดใช้ base64 และการกำหนดนามสกุลจาก data URL ไม่ได้ยืนยันว่าเนื้อหาเป็นภาพปลอดภัย
- Performance, latency จริง, SUS/usability และ visual fit ไม่สามารถสรุปจาก source; ต้องทดสอบสภาพแวดล้อมจริง

## 9. แผนที่เอกสาร

`wk01`–`wk04` เป็นหลักฐานการวิเคราะห์/ความต้องการเดิม จึงอธิบายเป้าหมายได้แม้บางข้อยังไม่ได้พัฒนา; `wk06`–`wk14` เป็นแบบจำลองและหลักฐานกิจกรรม ต้องแยก “ออกแบบ/แผนทดสอบ” ออกจาก “ผลที่ตรวจยืนยันแล้ว” ให้ชัด เอกสารสรุประบบที่ implement จริงอยู่ใน `project-report.docx`, `project-report.pdf` และเอกสารฉบับนี้
