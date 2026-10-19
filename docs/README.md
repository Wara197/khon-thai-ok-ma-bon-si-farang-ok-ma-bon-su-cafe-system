# ดัชนีเอกสารโครงการ Coffee Shop POS

อ่าน [เอกสารระบบตามการทำงานจริง](./as-built-reverse-engineering.md) เป็นหลักเมื่ออธิบายพฤติกรรมปัจจุบัน และใช้ [คู่มือไล่ source ทุกไฟล์](./code-tour.md) ตามหน้าที่ของแต่ละ source module. เอกสารรายสัปดาห์เป็นหลักฐานการวิเคราะห์/ออกแบบตามเวลาที่ทำงาน ข้อกำหนดหรือ wireframe อาจอธิบายเป้าหมายที่ยังไม่ implement และผลทดสอบ/สำรวจต้องอ้างอิงหลักฐานการเก็บข้อมูล ไม่อนุมานจากซอร์สโค้ด

## เอกสารรวมเล่มตามแนวทาง wk15

- [รายงานโครงงานฉบับสมบูรณ์ DOCX](./project-report.docx)
- [รายงานโครงงานฉบับสมบูรณ์ PDF](./project-report.pdf)
- [บันทึก Reverse-Engineering และ traceability](./as-built-reverse-engineering.md)
- [คู่มือไล่ source code ทุกไฟล์](./code-tour.md)
- [แนวทางนำเสนอและ Live Demo](./presentation-guide.md)

## เอกสารตามสัปดาห์

| สัปดาห์ | ไฟล์ | ประเภท/ขอบเขต |
|---|---|---|
| 01 | [wk01-team-charter.md](./wk01-team-charter.md) | ข้อตกลงทีมและแผนงาน |
| 02 | [wk02-feasibility-report.md](./wk02-feasibility-report.md) | ความเป็นไปได้และกระบวนการ; เป็นการวิเคราะห์/ประมาณการ |
| 03 | [wk03-requirements.md](./wk03-requirements.md) | Baseline requirements; สถานะจริงดู matrix ใน as-built report |
| 04 | [wk04-user-stories.md](./wk04-user-stories.md) | User stories / acceptance criteria; ไม่ใช่หลักฐานการ implement |
| 06 | [wk06-class-diagram.md](./wk06-class-diagram.md) | Class/BCM เทียบ source และ Object Diagram จาก seed fixture |
| 07 | [wk07-er-diagram.md](./wk07-er-diagram.md), [wk07-schema.sql](./wk07-schema.sql) | ER และ SQLite schema; schema runtime สร้างจาก `backend/db.js` |
| 09 | [wk09-sequence-diagram.md](./wk09-sequence-diagram.md) | ลำดับคำขอ API ตาม source |
| 09 | [sequence-diagrams.md](./sequence-diagrams.md) | ชี้ไปยัง sequence diagram ชุดเดียวกัน |
| 10 | [wk10-wireframe.md](./wk10-wireframe.md) | แบบ UI เป้าหมายพร้อมบันทึกความต่างจากหน้าจอจริง |
| 10 | [wk10-srs.md](./wk10-srs.md) | SRS as-built และข้อจำกัด |
| 11 | [wk11-architecture.md](./wk11-architecture.md) | Architecture 4+1 Views ของ runtime ปัจจุบัน |
| 12 | [wk12-usability-testing.md](./wk12-usability-testing.md) | บันทึกผล usability เดิม; ตัวเลขเป็นรายงานกิจกรรมและยังไม่ revalidate |
| 13 | [wk13-test-cases.md](./wk13-test-cases.md), [wk13-execution-log.md](./wk13-execution-log.md) | Test plan, UI walkthrough/API/fault injection log; ระบุ TC-15–16 ที่ยังไม่ทดสอบ |
| 14 | [wk14-quality-review.md](./wk14-quality-review.md) | Code review จาก source โดยแยกสิ่งที่วัดไม่ได้ |
| — | [ai-disclosure.md](./ai-disclosure.md) | การเปิดเผยการช่วยงานด้วย AI |

## หลักการอ่านสถานะ

- **ทำงานจากโค้ด:** มี implementation ใน routes/controllers/entities/components ที่อ้างถึง
- **บางส่วน/มีข้อจำกัด:** มี code path แต่ขอบเขตไม่ครบตาม requirement หรือมีเงื่อนไขที่รายงานไว้
- **ยังไม่พบใน runtime:** ไม่พบ schema/API/UI ที่ทำหน้าที่ดังกล่าว
- **ยังไม่ยืนยัน:** ต้องมีการทดสอบ runtime, usability, performance หรือ security แยกต่างหาก
