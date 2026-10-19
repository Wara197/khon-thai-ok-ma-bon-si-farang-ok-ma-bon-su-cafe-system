# Test Plan สำหรับตรวจระบบ Coffee Shop POS

**สัปดาห์:** 13 — Integration & E2E
**สถานะ:** ตาราง TC-01–TC-14 เป็น test plan; มีผล manual API integration smoke test แยกไว้ใน [บันทึกผลรอบ 19 ตุลาคม 2026](./wk13-execution-log.md)
**Source:** [as-built reverse-engineering](./as-built-reverse-engineering.md)

## 1. สภาพแวดล้อมที่ควรบันทึกเมื่อทดสอบ

ระบุ OS, Node version, Chrome version, viewport จริง, backend port, SQLite file ที่ใช้, วันที่/เวลา และ seed state ก่อนกรอกผลทุกครั้ง ห้ามใช้ตัวเลขความเร็วหรือผลลัพธ์เดิมเป็นผลรอบปัจจุบันโดยไม่วัดซ้ำ

## 2. Test Matrix

| ID | ขั้นตอนย่อ | ผลที่คาดจาก implementation | สถานะรอบนี้ |
|---|---|---|---|
| TC-01 | เปิด POS และโหลดเมนู | `GET /api/products` คืนหมวด, active products, options | ยังไม่รัน |
| TC-02 | เลือกเครื่องดื่มและ option; เพิ่ม bakery | modal แสดงชุดตัวเลือกตามชนิด; API คิดราคาตาม IDs ที่ส่ง | ยังไม่รัน |
| TC-03 | เปลี่ยนจำนวน/ลบรายการใน cart | ยอดรวม UI คำนวณจากราคาต่อหน่วยและจำนวน | ยังไม่รัน |
| TC-04 | ส่ง cart ว่าง/วิธีชำระไม่ถูกต้องตรง API | ควรได้ 400; verify ทั้ง UI และ direct API | ยังไม่รัน |
| TC-05 | สร้าง order ที่ถูกต้อง | response มี orderNo รูป `POS-YYYYMMDD-BB-XXXX`, queueNo และ pending | ยังไม่รันครบตาม test case; API smoke test สร้าง order เดี่ยวแล้ว |
| TC-06 | เปิดหน้า Barista | active orders ปรากฏเมื่อ polling รอบถัดไป (สูงสุดประมาณ 3 วินาที บวก network/render) | ยังไม่รัน |
| TC-07 | ส่ง status เดิม/ย้อน/ข้ามขั้นไปข้างหน้า | API รับเฉพาะสถานะถัดไปหนึ่งขั้น; เดิม/ย้อน/ข้ามถูกปฏิเสธด้วย 400 | ยังไม่รัน |
| TC-08 | ยกเลิก order ใน pending, cooking, ready, completed | pending/cooking ยกเลิกได้; ready/completed ถูกปฏิเสธ | ยังไม่รัน |
| TC-09 | กรองคิว/รายงานตาม branch | queue และ report รับ branchId; queue number แยกตามสาขาและวัน | ยังไม่รัน |
| TC-10 | เพิ่ม/แก้/ซ่อนเมนูและอัปโหลดรูป | CRUD ทำงาน; delete ทำเป็น `is_active=0`; ตรวจชนิดไฟล์อัปโหลดแยก | ยังไม่รัน |
| TC-11 | เปลี่ยน report period และตรวจ ledger | sales filters มี today/7d/30d/all; recent orders สูงสุด 50; queue summary ใน report ไม่ได้กรอง period | ยังไม่รัน |
| TC-12 | จำลอง insert order_item ล้มเหลว | transaction ต้อง rollback order, items และ stock movement ทั้งชุด | ยังไม่รัน; ต้องทดสอบ fault injection |
| TC-13 | เข้าหน้าสต็อกด้วยบัญชี barista | GET inventory แสดงชื่อ/ยอด/หน่วย/threshold; mutation endpoints ต้องตอบ 403 | ยังไม่รัน |
| TC-14 | สั่งเครื่องดื่มที่ระดับหวาน 25/50/75/100% | stock น้ำตาลลดตาม recipe rule; ระดับ 0% ไม่ลด; cancel คืนตาม consumption snapshot | ยังไม่รัน |

## 3. หลักฐานการทดสอบ

บันทึกเฉพาะผลที่ execute จริง พร้อมวันที่ สภาพแวดล้อม และข้อมูล request/response ที่ไม่เปิดเผย credential. API smoke test ใน execution log ใช้ฐานข้อมูลแยกและยืนยันเฉพาะ API flow; ไม่ถือเป็นผล UI E2E, concurrency, fault-injection, performance หรือ usability test และไม่เปลี่ยนสถานะ TC ที่ยังไม่รัน. TC-13/TC-14 เพิ่มหลังจากเปิด read-only stock view ให้ barista และเพิ่มสูตรน้ำตาล จึงยังไม่มีผล execute
