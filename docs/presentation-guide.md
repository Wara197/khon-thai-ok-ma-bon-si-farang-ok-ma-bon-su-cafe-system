# แนวทางนำเสนอและ Live Demo ตามระบบจริง

**สัปดาห์:** 15 — Final Presentation & Report
**เวลาแนะนำ:** 5–8 นาที ตาม wk15
**แหล่งข้อเท็จจริงของฟีเจอร์:** [as-built reverse-engineering](./as-built-reverse-engineering.md)

แนวทางนี้เป็นสคริปต์สำหรับการสาธิต ไม่ใช่บันทึกว่ามีการสาธิตหรือผ่านการทดสอบแล้ว ผู้พูดควรแยก requirement เป้าหมายออกจากฟีเจอร์ที่เปิดให้ดูได้จริง

## 1. ลำดับนำเสนอ

| ช่วง | เนื้อหา | เวลาแนะนำ |
|---|---|---:|
| บริบท | ปัญหาการรับออเดอร์และเป้าหมายโครงงาน (อ้างอิง wk01–wk02) | 0.5–1 นาที |
| ความต้องการ | actors, user stories, สรุป FR พร้อมชี้ข้อที่ยังไม่ implement | 1 นาที |
| ออกแบบ | Class/Object, ER/sequence และ Architecture 4+1 ที่เทียบกับ source | 1 นาที |
| Live Demo | Cashier → Barista → Owner | 2–3 นาที |
| ประเมิน/ข้อจำกัด | ผล usability ที่บันทึกไว้พร้อมระบุว่ายังไม่ revalidate; ข้อจำกัดจาก code review | 0.5–1 นาที |
| Q&A | ตอบตาม implementation จริง | 1–1.5 นาที |

แบ่งการพูดตามสมาชิกจริงในกลุ่มและข้อมูลใน team charter; เวลาข้างต้นเป็นแนวทาง ไม่กำหนดบุคคลแทนทีม

## 2. Live Demo

### เตรียมเครื่อง

1. จาก `project/` ติดตั้ง dependencies และ build frontend: `npm run install:all`, `npm run build:frontend`.
2. เริ่ม backend ด้วย `npm start`; runtime ใช้ SQLite ใน `backend/cafe_pos.db`.
3. เปิด `http://localhost:3000`; เปิดอีก browser tab สำหรับ Barista และ Owner โดยสลับแท็บในแอป.
4. ใช้ข้อมูล seed หรือข้อมูลสำหรับ demo ที่ตรวจแล้ว; อย่าอ้างตัวเลขตัวอย่างว่าเป็นยอดขายจริง.
5. เตรียมแผนสำรองเป็นภาพหน้าจอหรือวิดีโอที่บันทึกจากระบบทำงานจริง และตรวจไฟล์ไว้ล่วงหน้า; สื่อสำรองใช้กรณีระบบ/เครือข่ายขัดข้อง ไม่ใช้แทน live demo ตาม rubric.

### ขั้นตอนสาธิต

1. **Cashier:** แสดงหมวด/สินค้า เลือกเครื่องดื่มและตัวเลือกประเภท ขนาด ความหวาน/ท็อปปิง; เลือก bakery เพื่อแสดงตัวเลือกอุ่น/รับปกติ.
2. **Cart/checkout:** ปรับจำนวน ยืนยันวิธีชำระ `cash`, `transfer` หรือ `qr`; อธิบายว่านี่คือการบันทึกวิธีที่เลือก ไม่ใช่ gateway ยืนยันการรับเงิน.
3. **Receipt:** แสดง order no, queue no และผลลัพธ์การสร้างออเดอร์; การพิมพ์เรียก browser print.
4. **Barista:** รอ polling รอบถัดไป (สูงสุดประมาณ 3 วินาทีก่อน network latency); แสดงรายการและเลื่อนสถานะตามปุ่ม. เปิด `เช็คสต็อก` ให้ดูยอดวัตถุดิบและสถานะใกล้หมด โดยย้ำว่า role นี้อ่านได้อย่างเดียว.
5. **Owner:** แสดงการเลือก branch/report period, KPI, payment breakdown, top 5, ledger สูงสุด 50 records, live queue. ย้ำว่า sales report poll 60 วินาทีและ queue counts poll 5 วินาที.
6. **Menu Manager (หากมีเวลา):** เปิดแท็บจัดการเมนูและแสดงฟอร์มเพิ่ม/แก้/ซ่อนเมนู.

### เอกสารออกแบบที่จะชี้ระหว่างนำเสนอ

- Class diagram แสดง backend BCM; Object diagram ใน wk06 เป็น snapshot จาก seed fixture ที่ระบุใน `backend/db.js` ไม่ใช่ order ปัจจุบันจากระบบ.
- Architecture 4+1 ใน wk11 ประกอบด้วย Logical, Development, Process, Physical และ Scenarios. เลือกแสดงภาพรวม 1–2 มุมมองตามเวลาที่เหลือ แล้วชี้ว่าทั้งหมดอธิบายระบบเดียวกัน.
- wk13 บันทึก UI walkthrough, API checks และ fault injection ในฐานข้อมูลแยกสำหรับ TC-01–TC-14; TC-15–TC-16 ที่เพิ่มภายหลังยังไม่ทดสอบ. รอบนี้ไม่ได้วัด performance/usability และไม่ใช่หลักฐานการซ้อมนำเสนอ. อ้างอิงขอบเขตรายกรณีตาม [execution log](./wk13-execution-log.md).

## 3. ข้อเท็จจริงสำหรับ Q&A

| คำถาม | คำตอบที่ตรงกับ source |
|---|---|
| ระบบใช้ฐานข้อมูลอะไร? | Runtime ปัจจุบันใช้ SQLite ผ่าน `sqlite3`; `mysql2` เป็น dependency แต่ไม่เห็นถูกเรียกใน runtime path |
| คิวอัปเดตทันทีหรือไม่? | ใช้ polling: Barista 3 วินาที, Owner queue stats 5 วินาที, Owner sales report 60 วินาที; ไม่ใช่ WebSocket |
| ชำระ PromptPay ได้จริงหรือไม่? | ระบบบันทึกค่า payment method (`qr`) แต่ไม่พบการเชื่อมต่อหรือยืนยันธุรกรรมกับผู้ให้บริการ |
| ระบบมี stock deduction หรือไม่? | มีสูตรวัตถุดิบตาม option, ตรวจ/ตัดใน transaction, รับเข้า/ประวัติ movement และ low-stock alert |
| บาริสต้าจัดการสต็อกได้หรือไม่? | Barista อ่านยอดคงเหลือ/threshold/สถานะใกล้หมดได้; ปรับยอด รับเข้า และแก้สูตรได้เฉพาะ owner |
| สูตรน้ำตาลเป็นสูตรจริงของร้านหรือไม่? | เป็น seed สำหรับสาธิต 3/6/9/12 กรัมที่ความหวาน 25/50/75/100%; owner ต้องปรับให้ตรงสูตรจริง |
| การบันทึก order atomic หรือไม่? | order, items, queue allocation และ stock deduction อยู่ใน transaction; cancellation คืนจาก snapshot |
| รองรับสิทธิ์ผู้ใช้หรือไม่? | มี login, session cookie และ role guards สำหรับ owner/cashier/barista; ไม่มี MFA หรือ password recovery |
| ผล usability/performance ยืนยันแล้วหรือไม่? | มีตัวเลขในเอกสาร wk12 เดิม แต่ยังไม่ได้ทดสอบซ้ำใน build ปัจจุบัน; ห้ามนำเสนอเป็นผลล่าสุดโดยไม่ระบุแหล่ง/วันที่ |

## 4. สรุปข้อจำกัดเพื่อเสนอพัฒนาต่อ

สิ่งที่ควรทำต่อก่อนใช้งานจริง: ตรวจความปลอดภัยของ upload, เพิ่ม MFA/password recovery ตามความจำเป็น และตรวจวัด performance/usability ด้วยหลักฐานที่ทำซ้ำได้
