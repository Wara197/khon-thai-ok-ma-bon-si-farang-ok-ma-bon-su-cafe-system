# Coffee Shop POS

ระบบเว็บสำหรับรับออเดอร์หน้าร้าน แสดงคิวบาริสต้า และดูรายงาน/จัดการเมนูโดยเจ้าของร้าน เอกสารนี้สรุปพฤติกรรมที่ยืนยันจาก source; ตาราง requirement และผลประเมินเก่าบางรายการเป็นเป้าหมายหรือบันทึกกิจกรรม ไม่ใช่หลักฐานว่าระบบทำได้แล้ว

เอกสารอ้างอิงหลัก: [รายงาน Reverse-Engineering ตามระบบจริง](docs/as-built-reverse-engineering.md) และ [รายงานโครงงาน](docs/project-report.docx) / [PDF](docs/project-report.pdf)

## เทคโนโลยีและโครงสร้าง

- Frontend: React 19 + Vite, JavaScript, CSS
- Backend: Node.js + Express 4
- Runtime database: SQLite (`backend/cafe_pos.db`) ผ่าน `sqlite3`
- สถาปัตยกรรม: Express routes, controllers, entities และ SQLite wrapper
- มี login/session และ role authorization สำหรับ owner, cashier, barista
- Barista อ่านยอดคงเหลือและวัตถุดิบใกล้หมดได้; การรับเข้า/แก้ยอด/ตั้งสูตรสงวนให้ owner
- `mysql2` ยังเป็น dependency แต่ไม่ได้ถูกใช้โดย runtime database code

```text
project/
├── backend/
│   ├── db.js                  # SQLite schema, migration, seed เมนู/วัตถุดิบ/สูตร
│   ├── server.js              # Express API และ static frontend
│   ├── routes/                # auth, product, order, inventory, user APIs
│   ├── controllers/           # login, order, product, inventory และ report logic
│   ├── entities/              # SQLite queries
│   ├── auth/                  # password hashing และ session/role middleware
│   └── public/uploads/        # รูปเมนูที่ API จัดเก็บ
├── frontend/
│   ├── public/                # ไอคอน รูปเมนู และสำเนารูปสำหรับ Vite dev
│   └── src/
│       ├── App.jsx            # สถานะแท็บและสาขาส่วนกลาง
│       ├── services/api.js    # REST client
│       └── components/        # cashier/, barista/, owner/
├── docs/                      # เอกสารรายสัปดาห์, diagrams, รายงาน และคู่มือนำเสนอ
├── PRODUCT.md                 # บริบทผู้ใช้และขอบเขตผลิตภัณฑ์
├── DESIGN.md                  # visual system และ UI tokens
└── package.json               # คำสั่งติดตั้ง, build และเริ่มระบบ
```

ไฟล์ SQLite และ `.env` อยู่กับ backend เพื่อให้ runtime หาเจอ; โฟลเดอร์ `public/uploads` เป็นข้อมูลใช้งานจริงจึงไม่ย้ายไปปะปนกับ source. เปิด [ดัชนีเอกสาร](docs/README.md) เพื่อหาไฟล์แต่ละสัปดาห์และรายงาน.

## เริ่มใช้งาน

จากโฟลเดอร์ `project/`:

```bash
npm run install:all
npm run build:frontend
npm start
```

เปิด `http://localhost:3000` เซิร์ฟเวอร์สร้างตารางและ seed ข้อมูลเริ่มต้นใน startup หากต้องการแยกโหมดพัฒนา ใช้ `npm run dev:backend` และ `npm run dev:frontend`; Vite ทำงานที่พอร์ต 5173 และ proxy `/api` กับ `/uploads` ไปยัง backend พอร์ต 3000

ครั้งแรกให้สร้างบัญชีเจ้าของร้านจาก terminal แบบ interactive (รหัสผ่านจะไม่แสดงระหว่างพิมพ์):

```bash
cd backend
npm run create-user -- --username owner --role owner
```

จากนั้นเข้าสู่ระบบที่หน้าเว็บ บัญชีเจ้าของร้านเพิ่มบัญชีพนักงานและกำหนดบทบาทได้จากแท็บ “บัญชีพนักงาน” รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร สำหรับ production ที่ frontend อยู่คนละ origin ให้กำหนด `FRONTEND_ORIGIN` ใน `backend/.env` เป็น origin เต็มของ frontend (หลาย origin คั่นด้วย comma)

## API ที่มีใน source

| Method             | Path                                                                         | หน้าที่                                                             |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET                | `/api/products`                                                              | หมวดหมู่ เมนูที่เปิดขาย และตัวเลือก                                 |
| GET                | `/api/categories`                                                            | หมวดหมู่                                                            |
| GET                | `/api/branches`                                                              | สาขา                                                                |
| POST               | `/api/upload`                                                                | owner-only; PNG/JPEG/WEBP/GIF, ตรวจ signature และจำกัด 15 MB        |
| POST               | `/api/products`                                                              | เพิ่มเมนู                                                           |
| PUT / DELETE       | `/api/products/:id`                                                          | แก้ไข/ซ่อนเมนู                                                      |
| POST               | `/api/orders`                                                                | สร้างออเดอร์และบันทึกวิธีชำระที่เลือก                               |
| GET                | `/api/orders/queue`                                                          | รายการคิวที่ยัง active; รับ `branchId`                              |
| GET                | `/api/orders/queue/stats`                                                    | จำนวนคิวตามสถานะ; รับ `branchId`                                    |
| PATCH / DELETE     | `/api/orders/:id/status` / `/api/orders/:id`                                 | เปลี่ยนสถานะ / ยกเลิกคิว                                            |
| GET                | `/api/reports/sales`                                                         | รายงาน; รับ `branchId` และ `period`                                 |
| GET                | `/api/orders/report`                                                         | alias ของ sales report                                              |
| GET                | `/api/inventory`                                                             | owner ดูคลัง/สูตร/movements; barista ดูเฉพาะยอดคงเหลือและ low-stock |
| POST / PUT         | `/api/inventory`, `/api/inventory/:id`, `/api/inventory/:id/receive`         | owner เพิ่ม/ปรับ/รับวัตถุดิบ                                        |
| PUT / DELETE       | `/api/recipes`, `/api/recipes/:productId/:inventoryId/:optionType/:optionId` | owner จัดการสูตร รวมถึงสูตรระดับความหวาน                            |
| POST / GET / POST  | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`                        | เข้าสู่ระบบ, ดู session ปัจจุบัน, ออกจากระบบ                        |
| GET / POST / PATCH | `/api/users`, `/api/users/:id/active`, `/api/users/:id/password`             | owner จัดการบัญชีและสิทธิ์พนักงาน                                   |

## ขอบเขตที่ยังไม่มีใน runtime

ระบบมี login, role guard, บัญชีพนักงาน, session cookie, การตัดสต็อกตามสูตร, แจ้งเตือนสต็อกต่ำ และส่วนลดจำนวนเงินบาทแล้ว ส่วน gateway ชำระเงินจริง, ภาษี, WebSocket, ระบบจัดส่ง, การกู้บัญชีด้วยอีเมล และบัญชีเต็มรูปแบบยังอยู่นอกขอบเขต รายงานคืนรายการออเดอร์ล่าสุดได้สูงสุด 50 รายการและ queue stats ใน report เป็นยอดรวมทุกช่วงเวลา รายละเอียดข้อจำกัดและสถานะ requirement อยู่ใน [as-built report](docs/as-built-reverse-engineering.md)

## เอกสารประจำสัปดาห์

รายการเอกสารและคำอธิบายว่าไฟล์ใดเป็น requirement, แบบออกแบบ, แผนทดสอบ หรือผลที่มีหลักฐาน อยู่ที่ [docs/README.md](docs/README.md)
