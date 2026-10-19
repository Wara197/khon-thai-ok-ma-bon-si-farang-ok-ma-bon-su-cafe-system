# คู่มือไล่อ่านโค้ดระบบ Coffee Shop POS

เอกสารนี้สรุปหน้าที่ของไฟล์ source ที่ระบบเรียกใช้จริง แยกตามชั้น Boundary, Control, Entity และหน้าจอผู้ใช้ เพื่อให้ตาม flow จากหน้าจอไปถึงฐานข้อมูลได้สะดวก

## ภาพรวมการทำงาน

1. `frontend/src/main.jsx` เริ่มแอป React และโหลด stylesheet หลัก
2. `frontend/src/App.jsx` ตรวจ session/role แล้วเลือกหน้า Cashier, Barista หรือ Owner
3. หน้าจอเรียก `frontend/src/services/api.js` เพื่อส่ง HTTP request พร้อม session cookie ไป backend
4. `backend/server.js` ตรวจ session และส่ง request เข้า route ที่ตรงกับ URL
5. `backend/routes/` ตรวจสิทธิ์และเรียก controller; `backend/controllers/` ตรวจ input และทำ business logic
6. `backend/entities/` อ่านหรือเขียนข้อมูลผ่าน `backend/db.js`; `backend/schema.sql` อธิบายโครงสร้างฐานข้อมูล

## Backend

| ไฟล์                                         | หน้าที่                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `backend/server.js`                          | ตั้งค่า CORS/body parser/static files, ติดตั้ง authentication, mount routes และเริ่ม server หลังเตรียมฐานข้อมูล           |
| `backend/package.json`                       | ระบุ scripts และ dependencies ของ Express/SQLite รวมถึง CLI บัญชี; มี `mysql2` เป็น dependency แต่ไม่ได้ใช้โดย runtime DB |
| `backend/db.js`                              | เปิด SQLite, สร้าง schema, seed ข้อมูลเริ่มต้น/ตัวเลือก/สูตร, และให้ helper query/transaction                             |
| `backend/schema.sql`                         | schema อ้างอิงของตารางสาขา ผู้ใช้ เมนู ออเดอร์ ตัวเลือก สต็อก และสูตร                                                     |
| `backend/auth/middleware.js`                 | อ่าน session cookie, ตรวจ hash/วันหมดอายุ, บังคับ role และสร้าง/ลบ session                                                |
| `backend/auth/passwords.js`                  | hash และตรวจรหัสผ่านสำหรับบัญชีผู้ใช้                                                                                     |
| `backend/routes/authRoutes.js`               | endpoint เข้าสู่ระบบ ออกจากระบบ และตรวจ session                                                                           |
| `backend/routes/productRoutes.js`            | endpoint อ่านรายการสินค้า หมวดหมู่ และตัวเลือก                                                                            |
| `backend/routes/orderRoutes.js`              | endpoint สร้างออเดอร์ อ่านคิว เปลี่ยนสถานะ และยกเลิกออเดอร์                                                               |
| `backend/routes/inventoryRoutes.js`          | endpoint คลังวัตถุดิบ; owner จัดการได้ ส่วน owner/barista อ่านยอดได้                                                      |
| `backend/routes/userRoutes.js`               | endpoint บริหารบัญชีพนักงานสำหรับ owner                                                                                   |
| `backend/controllers/productController.js`   | รวมข้อมูลเมนู หมวดหมู่ และ product options เพื่อส่งให้หน้าร้าน                                                            |
| `backend/controllers/orderController.js`     | ตรวจตัวเลือก/ราคา สร้างคิวและออเดอร์ หักสต็อกตามสูตรใน transaction และคืนสต็อกเมื่อยกเลิก                                 |
| `backend/controllers/inventoryController.js` | ตรวจยอดและสูตร คำนวณรายการ low stock และแยกข้อมูล stock overview สำหรับบาริสต้า                                           |
| `backend/controllers/authController.js`      | ควบคุมกรณี login/logout/session ที่ route เรียกใช้งาน                                                                     |
| `backend/entities/Branch.js`                 | อ่านข้อมูลสาขา                                                                                                            |
| `backend/entities/Category.js`               | อ่านหมวดหมู่สินค้า                                                                                                        |
| `backend/entities/Product.js`                | อ่านเมนูและราคา                                                                                                           |
| `backend/entities/ProductOption.js`          | อ่านขนาด ความหวาน ประเภทเครื่องดื่ม ท็อปปิง และตัวเลือกเบเกอรี่                                                           |
| `backend/entities/Order.js`                  | บันทึกออเดอร์/รายการ สร้างคิว อ่านคิว เปลี่ยนสถานะ และจัดการข้อมูลรายการ                                                  |
| `backend/entities/Inventory.js`              | อ่านสต็อก สูตร และ movement; รับเข้า/ปรับยอด/ตั้งสูตร                                                                     |
| `backend/create-user.js`                     | CLI สำหรับสร้างบัญชีผู้ใช้เริ่มต้นหรือบัญชีผู้ดูแล                                                                        |
| `backend/update_images.js`                   | สคริปต์ปรับข้อมูล URL รูปเมนูในฐานข้อมูล                                                                                  |

## Frontend

| ไฟล์                                                     | หน้าที่                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `frontend/src/App.jsx`                                   | จัดการ session, role, สาขา และสลับหน้าหลักตามผู้ใช้                                      |
| `frontend/src/main.jsx`                                  | จุดเริ่มต้น React และนำเข้า CSS                                                          |
| `frontend/index.html`                                    | HTML shell ที่ Vite ใช้ mount React application                                          |
| `frontend/vite.config.js`                                | ตั้งค่า React plugin, dev server port 5173 และ proxy API/upload ไป backend port 3000     |
| `frontend/package.json`                                  | scripts และ dependencies ของ React, Vite, Lucide icons และ linter                        |
| `frontend/src/services/api.js`                           | รวม fetch helper, credentials/session และฟังก์ชันเรียก API แต่ละหมวด                     |
| `frontend/src/index.css`                                 | reset, ฟอนต์ และ CSS พื้นฐานระดับเอกสาร                                                  |
| `frontend/src/App.css`                                   | design tokens และ layout/component styles ของทุกหน้าระบบ                                 |
| `frontend/src/components/LoginScreen.jsx`                | ฟอร์มเข้าสู่ระบบ                                                                         |
| `frontend/src/components/Navbar.jsx`                     | แถบนำทาง เลือกสาขา แสดงผู้ใช้และออกจากระบบ                                               |
| `frontend/src/components/cashier/CashierView.jsx`        | รวมหน้าขาย เลือกเมนู ปรับแต่งสินค้า ตะกร้า และยืนยันการชำระเงิน                          |
| `frontend/src/components/cashier/CategoryTabs.jsx`       | แถบเลือกหมวดเมนู                                                                         |
| `frontend/src/components/cashier/ProductGrid.jsx`        | จัดวางรายการสินค้าเป็น grid                                                              |
| `frontend/src/components/cashier/ProductCard.jsx`        | แสดงภาพ/ชื่อ/ราคาและ action เพิ่มเมนู                                                    |
| `frontend/src/components/cashier/CustomizationModal.jsx` | เลือกอุณหภูมิ ขนาด ความหวาน ท็อปปิง และวิธีรับเบเกอรี่                                   |
| `frontend/src/components/cashier/CartSidebar.jsx`        | แสดงรายการในตะกร้า ยอดรวม ส่วนลด และปุ่มชำระเงิน                                         |
| `frontend/src/components/cashier/ReceiptModal.jsx`       | แสดงรายละเอียดใบเสร็จหลังรับชำระ                                                         |
| `frontend/src/components/barista/BaristaView.jsx`        | poll คิว แสดงตัวนับ/ตัวกรอง เปลี่ยนสถานะ และดูสต็อกแบบอ่านอย่างเดียว                     |
| `frontend/src/components/barista/QueueCard.jsx`          | แสดงรายละเอียดออเดอร์หนึ่งใบและปุ่มดำเนินสถานะ                                           |
| `frontend/src/components/owner/OwnerView.jsx`            | รวม dashboard รายงาน และเครื่องมือหลังบ้านของเจ้าของร้าน                                 |
| `frontend/src/components/owner/MenuManager.jsx`          | เปิด/ปิดเมนูและจัดการข้อมูลเมนู                                                          |
| `frontend/src/components/owner/InventoryManager.jsx`     | เพิ่มวัตถุดิบ ปรับยอด รับเข้า ตั้ง threshold และกำหนดสูตร                                |
| `frontend/src/components/owner/UserManager.jsx`          | จัดการบัญชีพนักงานและบทบาท                                                               |
| `package.json`                                           | scripts ระดับ repository สำหรับติดตั้ง dependencies, เปิด backend และสั่ง build frontend |

## Flow ตรวจสต็อกและสูตรน้ำตาล

- แผง `เช็คสต็อก` ใน BaristaView เรียก `fetchInventory()` เมื่อเปิดและอัปเดตทุก 30 วินาทีขณะเปิดอยู่
- `GET /api/inventory` อนุญาต owner และ barista; response ของ barista เลือกเฉพาะ `id`, `name`, `stock_qty`, `min_threshold`, `unit` และ low-stock; endpoint แก้ไข/รับเข้า/สูตรยัง owner-only
- `db.js` เพิ่มวัตถุดิบน้ำตาลด้วย `INSERT OR IGNORE` จึงไม่ reset ยอดที่มีอยู่
- สูตรสาธิตกำหนด 25/50/75/100% เป็นน้ำตาล 3/6/9/12 กรัมต่อแก้ว; 0% ไม่ตัดน้ำตาล สูตรตัวอย่างนี้แก้ได้ในหน้าเจ้าของร้าน
- ตอนสร้างออเดอร์ controller เลือกสูตรที่ตรงกับ `sweetnessId`, รวมปริมาณตามจำนวนแก้ว ตรวจวัตถุดิบพอ แล้วหักยอดและบันทึก movement พร้อมออเดอร์ใน transaction เดียว

## ขอบเขตไฟล์

ตารางด้านบนครอบคลุม source files ของ backend, React app, API client และ config ที่กำหนดพฤติกรรมของระบบ ส่วน dependency lockfiles, build output (`frontend/dist`), ไฟล์ภาพ/ฟอนต์ และโฟลเดอร์ upload เป็น artifacts/data ไม่ใช่ source module ที่ต้องอธิบาย logic ซ้ำ ไฟล์ public assets ที่ไม่ได้ import โดย source เป็นทรัพยากร static

> ค่ากรัมต่อระดับหวานเป็นค่าตั้งต้นสำหรับตัวอย่างระบบ ไม่ใช่สูตรมาตรฐานของร้าน ควรให้เจ้าของร้านปรับตามสูตรจริงก่อนใช้งานจริง
