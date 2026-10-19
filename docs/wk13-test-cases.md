# Test Plan สำหรับตรวจระบบ Coffee Shop POS

**สัปดาห์:** 13 — Integration & E2E
**สถานะ:** รันทดสอบ TC-01–TC-14 รอบ 19 ตุลาคม 2026 แล้ว ดูวิธีทดสอบและข้อจำกัดใน [บันทึกผลรอบ 19 ตุลาคม 2026](./wk13-execution-log.md)
**Source:** [as-built reverse-engineering](./as-built-reverse-engineering.md)

## 1. สภาพแวดล้อมที่บันทึกในการทดสอบ

ระบุ OS, Node version, browser/viewport, backend port, SQLite file ที่ใช้, วันที่/เวลา และ seed state สำหรับแต่ละรอบ ห้ามใช้ตัวเลขความเร็วหรือผลลัพธ์เดิมเป็นผลรอบปัจจุบันโดยไม่วัดซ้ำ

## 2. Test Matrix

| ID | ขั้นตอนย่อ | ผลที่คาดจาก implementation | สถานะรอบ 19 ต.ค. 2026 |
|---|---|---|---|
| TC-01 | เปิด POS และโหลดเมนู | `GET /api/products` คืนหมวด, active products, options | ผ่าน — UI/API |
| TC-02 | เลือกเครื่องดื่มและ option; เพิ่ม bakery | modal แสดงชุดตัวเลือกตามชนิด; API คิดราคาตาม IDs ที่ส่ง | ผ่าน — UI/API; drink options รวม ฿90 และ bakery รับปกติ ฿55 |
| TC-03 | เปลี่ยนจำนวน/ลบรายการใน cart | ยอดรวม UI คำนวณจากราคาต่อหน่วยและจำนวน | ผ่าน — UI; จำนวน 2→1 ยอด ฿120→฿60 และลบรายการได้ |
| TC-04 | ส่ง cart ว่าง/วิธีชำระไม่ถูกต้องตรง API | ควรได้ 400; verify ทั้ง UI และ direct API | ผ่าน — API ตอบ 400 ทั้งสองกรณี |
| TC-05 | สร้าง order ที่ถูกต้อง | response มี orderNo รูป `POS-YYYYMMDD-BB-XXXX`, queueNo และ pending | ผ่าน — UI/API |
| TC-06 | เปิดหน้า Barista | active orders ปรากฏเมื่อ polling รอบถัดไป (สูงสุดประมาณ 3 วินาที บวก network/render) | ผ่าน — UI; order ปรากฏหลัง polling รอบถัดไป |
| TC-07 | ส่ง status เดิม/ย้อน/ข้ามขั้นไปข้างหน้า | API รับเฉพาะสถานะถัดไปหนึ่งขั้น; เดิม/ย้อน/ข้ามถูกปฏิเสธด้วย 400 | ผ่าน — API |
| TC-08 | ยกเลิก order ใน pending, cooking, ready, completed | pending/cooking ยกเลิกได้; ready/completed ถูกปฏิเสธ | ผ่าน — API ครบทั้งสี่สถานะ |
| TC-09 | กรองคิว/รายงานตาม branch | queue และ report รับ branchId; queue number แยกตามสาขาและวัน | ผ่าน — API; ตรวจคิวสาขา 1/2 และ report สาขา 1 |
| TC-10 | เพิ่ม/แก้/ซ่อนเมนูและอัปโหลดรูป | CRUD ทำงาน; delete ทำเป็น `is_active=0`; ตรวจชนิดไฟล์อัปโหลดแยก | ผ่าน — API; CRUD, PNG upload/retrieve และปฏิเสธ MIME/signature ที่ไม่ตรง |
| TC-11 | เปลี่ยน report period และตรวจ ledger | sales filters มี today/7d/30d/all; recent orders สูงสุด 50; queue summary ใน report ไม่ได้กรอง period | ผ่าน — API; ครบ 4 periods และผลล่าสุด 24 รายการ (ไม่เกิน 50) |
| TC-12 | จำลอง insert order_item ล้มเหลว | transaction ต้อง rollback order, items และ stock movement ทั้งชุด | ผ่าน — fault injection ที่ order_item และ movement หลังตัด stock; rollback ทั้งชุด |
| TC-13 | เข้าหน้าสต็อกด้วยบัญชี barista | GET inventory แสดงชื่อ/ยอด/หน่วย/threshold; mutation endpoints ต้องตอบ 403 | ผ่าน — UI/API; อ่าน stock ได้และ POST/PUT/สูตรตอบ 403 |
| TC-14 | สั่งเครื่องดื่มที่ระดับหวาน 25/50/75/100% | stock น้ำตาลลดตาม recipe rule; ระดับ 0% ไม่ลด; cancel คืนตาม consumption snapshot | ผ่าน — API; 0/25/50/75/100% หัก 0/3/6/9/12 กรัม และยกเลิกแล้วคืนครบ |
| TC-15 (เพิ่มภายหลัง) | owner บันทึก/แก้วิธีชง แล้วสร้าง order ให้ barista | GET products คืนคำแนะนำ; order ใหม่เก็บข้อความเป็น snapshot ใน `options_json`; Barista QueueCard แสดงคำแนะนำ; แก้คำแนะนำภายหลังไม่เปลี่ยนข้อความใน order เดิม | ยังไม่ทดสอบ |
| TC-16 (เพิ่มภายหลัง) | สร้าง order จากทุกเมนูที่มีสูตร แล้วเปิดคิวบาริสต้า | QueueCard แสดงชื่อวัตถุดิบ หน่วย และปริมาณจาก `inventoryConsumptions` snapshot; คิวรุ่นเก่าที่มีเพียง inventory ID/ปริมาณยังแสดงชื่อ/หน่วยจากคลัง; ข้อความวิธีชงเสริมไม่แทนสูตร; เมนูที่ไม่มีสูตร snapshot แสดงสถานะชัดเจน | ยังไม่ทดสอบ |

## 3. หลักฐานการทดสอบ

บันทึกเฉพาะผลที่ execute จริง พร้อมวันที่ สภาพแวดล้อม และข้อมูล request/response ที่ไม่เปิดเผย credential. ผล UI ระบุเฉพาะกรณีที่ตรวจผ่านหน้าเว็บ; กรณี API/fault injection ใช้ฐานข้อมูลแยกและไม่ใช่หลักฐาน concurrency, performance หรือ usability test ดูรายละเอียดและ defect ที่แก้ระหว่างทดสอบใน execution log.
