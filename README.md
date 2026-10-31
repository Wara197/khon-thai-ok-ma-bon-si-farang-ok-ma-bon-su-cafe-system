# Coffee Shop POS

ระบบเว็บสำหรับรับออเดอร์หน้าร้าน แสดงคิวบาริสต้า และดูรายงาน/จัดการเมนูโดยเจ้าของร้าน

รายวิชา 88734065 การวิเคราะห์และออกแบบระบบ กลุ่ม cafe-pos-group02

## สมาชิกในกลุ่ม

| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา | บทบาท |
| ----- | ------------ | ------------ | ----- |
| 1 | นายวราวุฒิ จำนงค์ผล | 67160197 | Project Lead / PM |
| 2 | นายณภัทร ทองนาค | 67160182 | Business/System Analyst |
| 3 | นายปฏิญญา พูลผล | 67160016 | Designer (UML/DB) |
| 4 | นายณัฐวุฒิ รู้การนา | 67160028 | Developer |
| 5 | นายธนพล ภู่เพ็ง | 67160396 | Presenter/Documenter |

## เทคโนโลยี

- Frontend: React 19 + Vite (JavaScript)
- Backend: Node.js + Express 4
- Database: SQLite (`code/backend/cafe_pos.db` สร้างอัตโนมัติตอนเริ่มระบบ) ผ่าน `sqlite3`

## โครงสร้างโฟลเดอร์

```text
cafe-pos-group02/
├── code/
│   ├── backend/      # Express API, controllers, entities, SQLite
│   └── frontend/     # React + Vite (cashier, barista, owner)
├── docs/             # เอกสารรายสัปดาห์ diagrams รายงาน และ ai-disclosure/
├── package.json      # คำสั่งติดตั้ง build และเริ่มระบบ
└── README.md
```

## เอกสารโครงงาน

- [Project Report (PDF)](docs/project-report.pdf)
- [Team Charter](docs/wk01-team-charter.md)
- [Feasibility Report](docs/wk02-feasibility-report.md)
- [Requirements](docs/wk03-requirements.md)
- [User Stories](docs/wk04-user-stories.md)
- [Class Diagram](docs/wk06-class-diagram.png) และ [Object Diagram](docs/wk06-object-diagram.png)
- [ER Diagram](docs/wk07-er-diagram.png) และ [Schema](docs/wk07-schema.sql)
- [Sequence Diagram](docs/wk09-sequence-diagram.png)
- [Input/Output Design](docs/wk10-input-output-design.md)
- [Wireframe](docs/wk10-wireframe.md)
- [SRS](docs/wk10-srs.md)
- [Architecture](docs/wk11-architecture.md)
- [Usability Testing](docs/wk12-usability-testing.md)
- [Quality Review](docs/wk14-quality-review.md)
- [AI Disclosure](docs/ai-disclosure/) (wk05, wk09, wk10, wk13)

## เริ่มใช้งาน

ต้องติดตั้ง Node.js ก่อน แล้วรันจากโฟลเดอร์ root ของโปรเจกต์:

```bash
npm run install:all
npm run build:frontend
npm start
```

เปิด `http://localhost:3000` เซิร์ฟเวอร์จะสร้างตารางและข้อมูลเริ่มต้นตอนเริ่มระบบ

ครั้งแรกให้สร้างบัญชีเจ้าของร้านจาก terminal:

```bash
cd code/backend
npm run create-user -- --username owner --role owner
```

จากนั้นเข้าสู่ระบบที่หน้าเว็บ รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร

### โหมดพัฒนา

```bash
npm run dev:backend    # backend พอร์ต 3000
npm run dev:frontend   # frontend พอร์ต 5173 (proxy /api และ /uploads ไปยัง 3000)
```
