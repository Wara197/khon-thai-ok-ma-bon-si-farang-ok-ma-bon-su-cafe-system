# รายงานโครงงานระบบ Coffee Shop POS ตามระบบที่พัฒนาแล้ว

**รายวิชา:** 88734065 การวิเคราะห์และออกแบบระบบ (System Analysis and Design)  
**รูปแบบ:** รายงานรวมเล่มตามหัวข้อ wk15 โดยยึด implementation ใน repository เป็นหลัก  
**วันตรวจ source:** 19 ตุลาคม 2026

## บทที่ 1 บทนำ

โครงการ Coffee Shop POS เป็นเว็บแอปสำหรับรับออเดอร์ แสดงคิวการชง และดูข้อมูลการขายในร้าน โดยมุ่งช่วยให้แคชเชียร์ส่งรายการไปยังบาริสต้าและให้เจ้าของร้านติดตามยอดขายได้จากระบบเดียว รายงานนี้รวบรวมการวิเคราะห์และการออกแบบตามเอกสารรายสัปดาห์ โดยสรุปสถานะของระบบที่พัฒนาไว้ในภาคผนวก

ระบบมีหน้าจอ Cashier, Barista และ Owner/Menu Manager ใช้สถาปัตยกรรมเว็บแบบ client-server สำหรับงานหน้าร้านและงานบริหาร ขอบเขตระบบและเทคโนโลยีที่ตรวจพบสรุปไว้ในบทที่ 9; รายการฟังก์ชันที่ยังไม่พบในโค้ดระบุไว้ในภาคผนวก

อ้างอิงบริบทและข้อตกลงทีม: [wk01](./wk01-team-charter.md), [wk02](./wk02-feasibility-report.md).

## บทที่ 2 การวิเคราะห์ความเป็นไปได้และกระบวนการทำงาน

เอกสาร wk02 เป็นการวิเคราะห์/ประมาณการทางวิชาการ ไม่ใช่ข้อมูล production หรือผลวัดระบบปัจจุบัน การตรวจ source ยืนยันได้ว่าระบบมี frontend SPA, Express REST API และ SQLite file database ซึ่งสามารถรันแบบ server เดียวได้จาก backend. ไม่พบหลักฐานค่าใช้จ่ายจริง, ROI, เวลาปฏิบัติงานก่อน/หลัง หรือ business interview dataset ที่นำมายืนยันตัวเลขในรายงานนี้

กระบวนการที่มีในโค้ด: เลือกเมนูและตัวเลือก → ส่ง `POST /api/orders` พร้อมวิธีชำระและสาขา → backend ตรวจ input/คำนวณ/บันทึก → หน้าบาริสต้าดึงคิวด้วย polling → เปลี่ยนสถานะผ่าน API → owner อ่านรายงานจาก API. Diagram การทำงานอยู่ใน [wk09 sequence](./wk09-sequence-diagram.md).

## บทที่ 3 การวิเคราะห์ความต้องการ

เอกสาร [wk03](./wk03-requirements.md) กำหนดความต้องการเชิงหน้าที่และคุณภาพของระบบ ใช้เป็นฐานสำหรับออกแบบหน้าขาย การจัดคิว และรายงาน ส่วนตารางตรวจสอบความครอบคลุมของแต่ละ requirement เทียบกับ source อยู่ในภาคผนวก A

## บทที่ 4 User Stories และ Use Cases

เอกสาร [wk04](./wk04-user-stories.md) บันทึกผู้ใช้เป้าหมายและ acceptance criteria สำหรับแคชเชียร์ บาริสต้า และเจ้าของร้าน ใช้ User Stories เพื่อเชื่อมความต้องการกับ use cases และการออกแบบหน้าจอ โดยสถานะของ Stories ที่เกี่ยวข้องกับฟังก์ชันปัจจุบันสรุปไว้ในภาคผนวก A

## บทที่ 5 การออกแบบเชิงวัตถุ

Backend จัดกลุ่มหน้าที่เป็น routes, controllers, entities และ database wrapper เพื่อแยกการรับ request, business logic และการเข้าถึงข้อมูล เอกสาร [wk06](./wk06-class-diagram.md) แสดงทั้ง class diagram ที่ตรวจจาก source และ object diagram ซึ่งอ้างอิง seed fixture พร้อมระบุข้อจำกัดของข้อมูลตัวอย่าง

## บทที่ 6 การออกแบบฐานข้อมูล

การออกแบบข้อมูลครอบคลุมสาขา หมวดหมู่สินค้า เมนู ตัวเลือกสินค้า คำสั่งซื้อ รายการคำสั่งซื้อ วัตถุดิบ สูตรใช้วัตถุดิบ และประวัติการเคลื่อนไหว ใช้ ER diagram และ schema ใน [wk07](./wk07-er-diagram.md) อธิบายโครงสร้างที่ออกแบบ ส่วนตาราง runtime ปัจจุบันมีรายละเอียดในภาคผนวก A และ [เอกสาร as-built](./as-built-reverse-engineering.md)

## บทที่ 7 Business Logic และลำดับการทำงาน

ลำดับการทำงานหลักเริ่มจากรับและตรวจข้อมูลคำสั่งซื้อ คำนวณราคา บันทึกคำสั่งซื้อและรายการ จากนั้นหน้าบาริสต้าดึงคิวเพื่อดำเนินการและอัปเดตสถานะ ก่อนที่เจ้าของร้านจะเรียกดูข้อมูลรายงาน ลำดับ API และ business logic แสดงใน [wk09](./wk09-sequence-diagram.md); รายละเอียดพฤติกรรมและข้อจำกัดที่ยืนยันจาก source อยู่ในภาคผนวก A

## บทที่ 8 Input, Output และ UI

การออกแบบ I/O ครอบคลุมการรับข้อมูลสินค้าและตัวเลือกจากแคชเชียร์ การแสดงคิวและสถานะสำหรับบาริสต้า และการแสดงสรุปยอดขายสำหรับเจ้าของร้าน เอกสาร [wk10-wireframe](./wk10-wireframe.md) ใช้อธิบายแนวคิดหน้าจอ และ SRS ระบุ input/output ของแต่ละส่วน

## บทที่ 9 สถาปัตยกรรมระบบ

ระบบใช้สถาปัตยกรรม client-server โดย frontend พัฒนาด้วย React/Vite และ backend ใช้ Node.js/Express ให้บริการ REST API และไฟล์ static ฐานข้อมูลเป็น SQLite สำหรับการจัดเก็บข้อมูลในเครื่อง [wk11 architecture](./wk11-architecture.md) จัดรายละเอียดเป็น 4+1 View: logical, development, process, physical และ scenarios; ตารางภาคผนวก A ระบุ runtime ที่ยืนยันจาก source

## บทที่ 10 ผลการประเมิน Usability

เอกสาร [wk12](./wk12-usability-testing.md) บันทึกผล usability จากกิจกรรมเดิม รายงานฉบับนี้นำเสนอผลดังกล่าวในฐานะข้อมูลที่รายงานไว้เดิม และไม่ยืนยันว่าเป็นผลประเมินซ้ำของ build ปัจจุบัน เนื่องจากหลักฐานดิบไม่อยู่ใน repository ที่ตรวจ

## บทที่ 11 ผลการรวมระบบและ Integration

การออกแบบ integration เชื่อมหน้าขาย API ฐานข้อมูล หน้าบาริสต้า และรายงานเจ้าของร้านตาม sequence ที่กำหนด เอกสาร [wk13](./wk13-test-cases.md) เป็น test plan และมีผล manual API integration smoke test แยกใน [execution log](./wk13-execution-log.md); ยังไม่ใช่ผล UI E2E หรือการซ้อม live demo ผ่านหน้าจอ

## บทที่ 12 การตรวจคุณภาพและความปลอดภัย

การประเมินคุณภาพใน [wk14](./wk14-quality-review.md) ครอบคลุมการทบทวนคุณภาพและความปลอดภัยของระบบ ข้อค้นพบจากการตรวจ source และรายการทดสอบที่ยังไม่มีหลักฐานยืนยันถูกรวมไว้ในภาคผนวก A เพื่อให้ตรวจสอบย้อนกลับได้

## บทที่ 13 สรุปผลและข้อเสนอแนะ

ระบบมีองค์ประกอบสำหรับการขาย การจัดคิว การจัดการเมนู คลังวัตถุดิบพร้อมสูตรตามตัวเลือก การรับเข้า/ประวัติ movement และการแจ้งเตือนสต็อกต่ำ โดย Owner จัดการสต็อกได้และ Barista อ่านยอด/สถานะได้แบบ read-only ข้อเสนอแนะสำคัญคือซ้อม live demo ผ่าน UI จริงและเก็บหลักฐานการทดสอบซ้ำ รายละเอียดความครอบคลุม ข้อจำกัด และความเสี่ยงอยู่ในภาคผนวก A

## บทที่ 14 ภาคผนวก

### A. ตารางตรวจเทียบเอกสารกับระบบที่พัฒนา

ตารางนี้เป็นภาคผนวกสำหรับตรวจสอบย้อนกลับระหว่างข้อกำหนด/เอกสารรายสัปดาห์กับ implementation ที่พบใน source ณ วันที่ตรวจ ไม่ใช่ผลทดสอบ runtime

| หัวข้อ                | สิ่งที่เอกสาร/แบบกำหนด                 | สิ่งที่พบในโค้ดจริง                                                                                                                                                                                                                                                                 | สถานะ/ข้อจำกัด                                                                           |
| --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| เทคโนโลยีและฐานข้อมูล | เอกสารบางฉบับกล่าวถึง MySQL            | React 19 + Vite, Node.js + Express, SQLite ผ่าน `sqlite3`; startup สร้าง 13 ตารางใน `backend/db.js`                                                                                                                                                                                 | runtime ใช้ SQLite; `mysql2` ยังเป็น dependency แต่ไม่อยู่ใน database path               |
| FR-01 เมนู            | แสดงเมนูที่เปิดขาย                     | มี 4 หมวดและ 10 เมนูใน seed                                                                                                                                                                                                                                                         | ทำงานตามข้อมูล seed                                                                      |
| FR-02 ตัวเลือกสินค้า  | เลือกชนิด/ขนาด/ความหวาน/ท็อปปิง        | รองรับ temperature, size, sweetness, topping และ bakery option                                                                                                                                                                                                                      | ทำงานตามตัวเลือกที่รองรับ                                                                |
| FR-03 ตรวจคำสั่งซื้อ  | ตรวจข้อมูลก่อนรับออเดอร์               | ตรวจ items, payment, product, quantity และชนิด option ID; บังคับตัวเลือกจำเป็นและสูตรที่ตรงกับสินค้า                                                                                                                                                                                | API แยก role guard ตามประเภท endpoint                                                    |
| FR-04 เลขออเดอร์/คิว  | ออกเลขออเดอร์และคิว                    | `POS-YYYYMMDD-BB-XXXX`; `BEGIN IMMEDIATE` จองเลขคิวแยกสาขาใน transaction                                                                                                                                                                                                            | ทำงานภายใน SQLite connection เดียว                                                       |
| FR-05 ราคา            | คำนวณยอดตามสินค้าและตัวเลือก           | base + option ที่ผ่านการตรวจชนิด, คูณ quantity และหักส่วนลดจำนวนเงินบาท                                                                                                                                                                                                             | ไม่มี tax                                                                                |
| FR-06 ชำระเงิน        | รองรับวิธีชำระ                         | บันทึก `cash`, `transfer`, `qr` ใน order                                                                                                                                                                                                                                            | ไม่มี payment gateway หรือยืนยันการชำระเงินจริง                                          |
| FR-07 ส่งคิว          | ส่งรายการไปยังหน้าบาริสต้า             | Barista ดึง queue ผ่าน polling ทุก 3 วินาที                                                                                                                                                                                                                                         | ไม่มี WebSocket/SSE push                                                                 |
| FR-08 สถานะคิว        | ติดตามสถานะและยกเลิก                   | ใช้ `pending`, `cooking`, `ready`, `completed`; ต้องไปขั้นถัดไป; ยกเลิกได้เฉพาะ pending/cooking                                                                                                                                                                                     | ยอมเฉพาะลำดับต่อเนื่อง                                                                   |
| FR-09 สต็อก           | ติดตามสต็อก/แจ้งเตือน                  | สูตร base/override ตาม size, temperature, sweetness หรือ bakery option; มี stock น้ำตาลและสูตร seed 3/6/9/12 กรัมสำหรับความหวาน 25/50/75/100%; รับเข้า/ปรับยอด/ดู movement; ตัดและคืน stock ตาม snapshot; Barista อ่านยอด/threshold ได้ | เมนูที่ไม่มีสูตรตรงกับตัวเลือกจะถูกปฏิเสธ; การแก้ stock/สูตรยัง owner-only; ค่ากรัมน้ำตาลเป็น seed |
| FR-10 รายงาน          | ดูรายงานการขาย                         | รองรับ 4 period, payment breakdown, top 5 และ recent orders สูงสุด 50; owner queue stats แยกจาก report                                                                                                                                                                              | ทำงานบางส่วน; queue stats ไม่กรองตาม period                                              |
| FR-11 Login/สิทธิ์    | แยกบทบาท cashier, barista, owner       | Session cookie; API role guards; owner จัดการบัญชีและ reset password                                                                                                                                                                                                                | ไม่มี MFA, password recovery หรือ audit trail                                            |
| โครงสร้างข้อมูล       | ER/schema ตามแบบ wk07                  | 13 ตาราง runtime: `branches`, `categories`, `products`, `product_options`, `orders`, `order_items`, `inventory`, `product_recipes`, `product_recipe_rules`, `inventory_movements`, `schema_migrations`, `users`, `sessions`; `options_json` เก็บตัวเลือกและ snapshot วัตถุดิบที่ใช้ | `product_recipes` เป็น legacy สำหรับ migration; `orders.branch_id` ยังไม่มี FK           |
| การบันทึก order       | บันทึก header, รายการสินค้า และ stock  | transaction เดียวครอบการตรวจสูตร/stock, คิว, header/items และ stock deduction                                                                                                                                                                                                       | cancellation คืนจากสูตร snapshot บน line item                                            |
| UI และ I/O            | Wireframe สำหรับ cashier/barista/owner | มีหน้าจอทั้งสามกลุ่มและ Menu Manager                                                                                                                                                                                                                                                | wireframe เป็นแบบ ไม่ใช่ภาพยืนยัน UI ปัจจุบัน; branch selector ของ Owner เป็น state แยก  |
| Usability             | wk12 มีผลกิจกรรมประเมินเดิม            | ไม่พบ raw participant evidence สำหรับคำนวณซ้ำ                                                                                                                                                                                                                                       | แสดงเป็น historical reported result; ยังไม่ revalidate                                   |
| Integration/testing   | wk13 กำหนด test cases                  | รัน manual API smoke test ใน SQLite แยก: login → create order → queue → status changes → owner report                                                                                                                                                                               | flow API ที่ระบุผ่าน; ไม่มี automated suite หรือหลักฐาน UI E2E; TC-01–TC-14 ยังไม่รันครบ |
| Quality/security      | wk14 กำหนดหัวข้อ review                | มี role guard, password hash และ session cookie; CORS จำกัด origin; upload validation ยังจำกัด                                                                                                                                                                                      | เป็นข้อค้นพบจาก source review ไม่ใช่ผล security test; ยังไม่มี MFA/recovery/audit log    |
| ขอบเขตนอกระบบ         | ความต้องการเพิ่มเติมในเอกสารเดิม       | ไม่พบ real payment confirmation, tax, delivery integration หรือ full accounting; ส่วนลดเป็นจำนวนเงินบาทรองรับแล้ว                                                                                                                                                                      | จัดเป็น future scope จนกว่าจะมี implementation                                           |

### B. API routes

| Method             | Endpoint                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| GET                | `/api/products`, `/api/categories`, `/api/branches`                                        |
| POST               | `/api/products`, `/api/orders`, `/api/upload`                                              |
| PUT / DELETE       | `/api/products/:id`                                                                        |
| GET                | `/api/orders/queue`, `/api/orders/queue/stats`, `/api/reports/sales`, `/api/orders/report` |
| PATCH / DELETE     | `/api/orders/:id/status`, `/api/orders/:id`                                                |
| POST / GET         | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`                                      |
| GET / POST / PATCH | `/api/users`, `/api/users/:id/active`, `/api/users/:id/password`                           |
| GET / POST / PUT   | `/api/inventory`, `/api/inventory/:id`, `/api/inventory/:id/receive`                       |
| PUT / DELETE       | `/api/recipes`, `/api/recipes/:productId/:inventoryId/:optionType/:optionId`               |

สิทธิ์ API ที่ตรวจจาก routes: owner/barista อ่าน inventory ได้ โดย barista เห็นเฉพาะ stock overview; mutation ของเมนู/สต็อก/สูตร/บัญชีจำกัด owner; สร้าง order ได้เฉพาะ cashier/owner; อ่าน queue และเปลี่ยนสถานะได้ barista/owner; รายงานและ queue stats จำกัด owner.

### C. เอกสารประกอบตาม wk15

| สัปดาห์ | เอกสารใน repository                                                                | ประเภทและวิธีอ่าน                                        |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 01      | [Team Charter](./wk01-team-charter.md)                                             | ข้อตกลง/แผนทีม                                           |
| 02      | [Feasibility](./wk02-feasibility-report.md)                                        | ประมาณการเดิม; ไม่ใช่ ROI ที่วัดจาก runtime              |
| 03      | [Requirements](./wk03-requirements.md)                                             | Baseline ความต้องการ; สถานะจริงดูบท 3                    |
| 04      | [User Stories](./wk04-user-stories.md)                                             | Stories/INVEST; ไม่ใช่ผลทดสอบ                            |
| 06      | [Class และ Object Diagrams](./wk06-class-diagram.md)                               | BCM class mapping และ object snapshot จาก seed fixture   |
| 07      | [ER Diagram](./wk07-er-diagram.md), [Schema](./wk07-schema.sql)                    | SQLite runtime schema reference                          |
| 09      | [Sequence](./wk09-sequence-diagram.md)                                             | API flows ตาม source                                     |
| 10      | [Wireframe](./wk10-wireframe.md), [SRS](./wk10-srs.md)                             | Wireframe เป็นแบบ; SRS แยกสถานะ as-built                 |
| 11      | [Architecture](./wk11-architecture.md)                                             | 4+1 Views เทียบ runtime architecture                     |
| 12      | [Usability](./wk12-usability-testing.md)                                           | Historical reported result, ยังไม่ revalidate            |
| 13      | [Test Plan](./wk13-test-cases.md), [Execution Log](./wk13-execution-log.md)        | Manual API smoke result; full TC matrix/UI E2E ยังไม่รัน |
| 14      | [Quality Review](./wk14-quality-review.md)                                         | Source review; ไม่ใช่ security test                      |

### D. คำอธิบายไฟล์ source

หน้าที่ของไฟล์ application source, configuration และ static shell แต่ละส่วนระบุไว้ใน [คู่มือไล่ source code](./code-tour.md). ไฟล์ dependency lock, build output, รูปภาพ และข้อมูลอัปโหลดเป็น artifacts/data ไม่ใช่โมดูล business logic.
