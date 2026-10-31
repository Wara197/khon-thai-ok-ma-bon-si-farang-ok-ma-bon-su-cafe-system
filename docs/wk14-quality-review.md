# Code Review จาก Source ปัจจุบัน

**สัปดาห์:** 14 — Quality Review
**ขอบเขต:** ตรวจอ่าน source ใน `project/backend/` และ `project/frontend/src/` ไม่ใช่ penetration test, performance test หรือ E2E execution
**วันตรวจ:** 19 ตุลาคม 2026

## 1. ความสามารถที่มีเส้นทางโค้ด

| หัวข้อ              | Source ที่พบ                                                              | ผลอ่าน source                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| โหลดเมนูและตัวเลือก | `Product.findAllActive()`, `ProductOption.findAll()`, `GET /api/products` | มี implementation                                                                                                                                                                                      |
| ตรวจสอบ/คำนวณ order | `orderController.createOrder()`                                           | ตรวจรายการ/สินค้า/จำนวน/size ของเครื่องดื่ม/payment; คิด base + option + qty                                                                                                                           |
| สร้างเลข            | transaction ใน `orderController.createOrder()` และ unique `order_no`      | จองเลขคิวแยกสาขาด้วย `BEGIN IMMEDIATE`; insert order อยู่ใน transaction เดียวกัน                                                                                                                       |
| Order persistence   | transaction ใน `orderController.createOrder()` และ `cancelOrder()`        | สร้าง order/items/ตัด stock และคืน stock ตอนยกเลิกแบบ atomic                                                                                                                                           |
| สถานะ               | `updateStatus()` / `cancelOrder()`                                        | รับเฉพาะสถานะถัดไป; cancel ได้เฉพาะ pending/cooking                                                                                                                                                    |
| รายงาน              | `Order.getSalesReport()`                                                  | มี sales periods, payment, top 5, recent 50; queue statuses ไม่ได้ใช้ report period                                                                                                                    |
| Menu delete         | `Product.delete()`                                                        | soft delete ผ่าน `is_active=0`                                                                                                                                                                         |
| สต็อก               | `Inventory` entity/routes และ order controller                            | มีสูตร base/override ตาม size/temperature/sweetness/bakery option, seed น้ำตาลตามระดับหวาน, รับเข้า/movement, low-stock alert, ตรวจ/ตัด/คืนใน transaction; Barista อ่าน stock overview ได้แต่แก้ไม่ได้ |
| Authentication      | auth controllers/middleware และ user routes                               | password hash, expiring sessions, role guard; owner จัดการผู้ใช้                                                                                                                                       |

## 2. ประเด็นที่ควรจัดการก่อนนำใช้ข้อมูลจริง

| ระดับ | Finding                                                   | ผลกระทบ/เหตุผล                                                                                                                          |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P1    | ยังไม่มี MFA/password recovery/audit log                  | บัญชีใช้รหัสผ่านกับ session อายุ 12 ชั่วโมง; ไม่มี self-service recovery หรือบันทึกเหตุการณ์เปลี่ยนสิทธิ์                               |
| P2    | `orders.branch_id` ไม่มี foreign key                      | SQLite foreign keys เปิดอยู่ แต่ DDL ไม่กำหนด FK สำหรับสาขาบนออเดอร์                                                                    |
| P2    | upload รับ base64 และตรวจชนิดไฟล์ได้บางส่วน               | route ตรวจ allowlist PNG/JPEG/WEBP/GIF, signature และขนาด 15 MB แล้ว แต่ยังควรพิจารณา quota, rate limit และนโยบายเก็บ/ลบไฟล์ก่อนใช้จริง |
| P2    | sales report จำกัด ledger 50; queue counts รวมทุกช่วงเวลา | ผู้ใช้ต้องเข้าใจข้อจำกัดของข้อมูลและตัวกรอง                                                                                             |
| P3    | `mysql2`/MySQL schema แยกจาก SQLite runtime               | ทำให้เอกสาร/ผู้พัฒนาสับสนว่า runtime ใช้ DB ใด                                                                                          |

## 3. Observed architecture

มี routes, controllers, entities และ `db.js` wrapper จริง แต่บาง route จัดการสาขา/upload โดยตรง และ `Order` entity มี aggregate report logic จึงไม่ควรระบุว่า routes “ไม่มี business logic ทุกกรณี” หรือ Entity “มีแต่ CRUD เท่านั้น”

## 4. สิ่งที่ยังไม่ประเมิน

ยังไม่มีหลักฐานจากการทดสอบรอบนี้สำหรับ latency, 2-second load target, 5-second end-to-end target, SUS, browser compatibility, accessibility conformance, SQL injection test, XSS test, file upload security หรือ availability. `npm run build`/lint เป็น static checks ที่ไม่ยืนยันประเด็นเหล่านั้น

## 5. ลำดับข้อเสนอแนะ

1. เพิ่ม quota/rate limit และนโยบาย lifecycle สำหรับไฟล์อัปโหลด โดย validation MIME/signature/size ขั้นต้นมีอยู่แล้ว.
2. พิจารณา MFA, password recovery และ audit log ก่อนเปิดใช้งานภายนอก.
3. เพิ่ม foreign key สำหรับ `orders.branch_id` ผ่าน migration ที่เข้ากันได้กับข้อมูลเดิม.
4. กำหนด report metrics/period ให้สอดคล้อง และเพิ่ม tests ที่ทำซ้ำได้.
