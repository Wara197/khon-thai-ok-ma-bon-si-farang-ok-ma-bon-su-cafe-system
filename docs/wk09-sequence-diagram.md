# Sequence Diagrams: ระบบ Coffee Shop POS (System Analysis & Design)

เอกสารการออกแบบ **Sequence Diagrams** ตามมาตรฐาน UML 2.x และสถาปัตยกรรม **BCE / BCM (Boundary-Control-Entity)** โดยอ้างอิงเนื้อหาจากสไลด์บทเรียน [Sequence.pdf](file:///c:/691-88734065%20System%20Analysis%20and%20Designs/Project-POS/lesson/Sequence.pdf) (หัวข้อ 9, 10, และ 11) และเชื่อมโยงกับข้อกำหนดความต้องการ [wk03-requirements.md](file:///c:/691-88734065%20System%20Analysis%20and%20Designs/Project-POS/lesson/wk03-requirements.md) และ [wk04-user-stories.md](file:///c:/691-88734065%20System%20Analysis%20and%20Designs/Project-POS/lesson/wk04-user-stories.md)

---

## 1. ภาพรวมกระบวนการทางธุรกิจในชีวิตจริง (Business Process Sequence Diagram)

_อ้างอิง: Sequence.pdf หัวข้อ 6.1 การสั่งกาแฟที่ร้านคาเฟ่ (Ordering Coffee)_

แผนภาพนี้แสดงลำดับเหตุการณ์การมีปฏิสัมพันธ์ระหว่างคนในชีวิตจริง (ลูกค้า, พนักงานแคชเชียร์, และบาริสต้า) ก่อนแปลงเป็นซอฟต์แวร์

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า
    actor Cashier as พนักงานแคชเชียร์
    actor Barista as บาริสต้า
    participant POS as หน้าจอระบบ POS

    Customer->>Cashier: 1. สั่งกาแฟ (เช่น ลาเต้เย็น หวาน 50% เพิ่มไข่มุก)
    Cashier->>POS: 2. กดเลือกเมนูและตัวเลือก (ขนาด/หวาน/ท็อปปิง)
    POS-->>Cashier: 3. คำนวณและแสดงยอดรวม 95 บาท
    Cashier->>Customer: 4. แจ้งยอดราคา 95 บาท และถามวิธีชำระเงิน
    Customer->>Cashier: 5. ยื่นเงินสด 100 บาท / สแกน QR
    Cashier->>POS: 6. กดบันทึกการชำระเงิน (Cash / QR / Transfer)
    POS->>POS: 7. บันทึกออเดอร์, ออกเลขคิว #002, พิมพ์ใบเสร็จ
    POS-->>Customer: 8. มอบใบเสร็จและแจ้งเลขคิว #002
    POS->>Barista: 9. ส่งข้อมูลออเดอร์เข้าหน้าจอบาริสต้าทันที (ภายใน 5 วินาที)

    Note over Barista: บาริสต้าดูสูตรบนจอแล้วลงมือชงกาแฟ
    Barista->>POS: 10. กดเปลี่ยนสถานะ "กำลังชง (cooking)"
    Note over Barista: ชงกาแฟเสร็จเรียบร้อย
    Barista->>POS: 11. กดเปลี่ยนสถานะ "พร้อมรับ (ready)"
    Cashier->>Customer: 12. ขานเรียกคิว #002 ส่งมอบกาแฟให้ลูกค้า
```

---

## 2. แผนภาพซอฟต์แวร์มุมมอง BCE (Boundary-Control-Entity)

_อ้างอิง: Sequence.pdf หัวข้อ 10 และ 11 (Checkout & Order Flow ในมุมมอง BCE)_

ในการพัฒนาซอฟต์แวร์ Lifeline จะถูกแบ่งออกตามหน้าที่ของสถาปัตยกรรม BCM:

- **`<<boundary>>`**: หน้าจอผู้ใช้ (Frontend Screen) หรือ API Route ที่รับข้อมูลเข้าสู่ระบบ
- **`<<control>>`**: คลาสหรือฟังก์ชัน Controller ที่ทำหน้าที่ควบคุม Flow และการตัดสินใจตามกฎเกณฑ์ธุรกิจ (Business Logic)
- **`<<entity>>`**: คลาสข้อมูลสำหรับเข้าถึงฐานข้อมูล MySQL โดยตรง

---

### แผนภาพที่ 1: การโหลดเมนูและตัวเลือกสินค้า (FR-01, FR-02)

_Use Case 01: รับออเดอร์ «include» UC-02 เลือกเมนู ขนาด ความหวาน และท็อปปิง_

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as พนักงานแคชเชียร์
    participant Screen as <<boundary>><br/>POS Screen (UI)
    participant Route as <<boundary>><br/>productRoutes
    participant Ctrl as <<control>><br/>productController
    participant ProdEnt as <<entity>><br/>Product
    participant OptEnt as <<entity>><br/>ProductOption
    participant DB as <<database>><br/>MySQL (cafe_pos)

    Cashier->>Screen: เปิดหน้ารับออเดอร์ (POS View)
    activate Screen
    Screen->>Route: GET /api/products
    activate Route
    Route->>Ctrl: listProducts()
    activate Ctrl

    Ctrl->>ProdEnt: findAllActive()
    activate ProdEnt
    ProdEnt->>DB: SELECT * FROM products WHERE is_active = 1
    DB-->>ProdEnt: rows (products & category)
    ProdEnt-->>Ctrl: products[]
    deactivate ProdEnt

    Ctrl->>OptEnt: findAll()
    activate OptEnt
    OptEnt->>DB: SELECT * FROM product_options ORDER BY option_type
    DB-->>OptEnt: rows (options)
    OptEnt-->>Ctrl: options[]
    deactivate OptEnt

    Note over Ctrl: จัดกลุ่มเมนูตาม Category<br/>แปลงราคาเป็น Float (ป้องกัน string concatenation)
    Ctrl-->>Route: { categories: [...], options: { size, sweetness, topping } }
    deactivate Ctrl
    Route-->>Screen: 200 OK (Product & Options JSON)
    deactivate Route

    Screen-->>Cashier: แสดงการ์ดเมนู 4 หมวด และตัวเลือกขนาด/หวาน/ท็อปปิง
    deactivate Screen
```

---

### แผนภาพที่ 2: การสั่งซื้อ คำนวณราคา ออกเลขคิว และชำระเงิน (FR-03, FR-04, FR-05, FR-06, FR-07)

_Use Case 01: รับออเดอร์ «include» UC-02 (ตัวเลือก) และ UC-03 (บันทึกวิธีชำระเงิน)_  
_ครอบคลุม Main Flow, Alternative Flow (A1) และ Exception Flows (E1: ข้อมูลไม่ครบ, E3: Rollback Transaction)_

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as พนักงานแคชเชียร์
    participant Screen as <<boundary>><br/>POS Screen (UI)
    participant Route as <<boundary>><br/>orderRoutes
    participant Ctrl as <<control>><br/>orderController
    participant ProdEnt as <<entity>><br/>Product
    participant OptEnt as <<entity>><br/>ProductOption
    participant OrderEnt as <<entity>><br/>Order
    participant DB as <<database>><br/>MySQL (cafe_pos)

    Cashier->>Screen: เลือกเมนู + ขนาด + ความหวาน + ท็อปปิง ลงตะกร้า
    Screen->>Screen: คำนวณราคาย่อยชั่วคราวบนหน้าจอ (Client-side)
    Cashier->>Screen: เลือกวิธีชำระเงิน (cash/transfer/qr) และกดยืนยันออเดอร์
    activate Screen

    Screen->>Route: POST /api/orders (items, paymentMethod)
    activate Route
    Route->>Ctrl: createOrder({ items, paymentMethod })
    activate Ctrl

    Note over Ctrl: ตรวจสอบความถูกต้องของข้อมูล (Validation - FR-03)

    alt ข้อมูลไม่ถูกต้อง (Exception E1: ตะกร้าว่าง / ไม่ระบุวิธีชำระเงิน / ไม่เลือกขนาด)
        Ctrl-->>Route: 400 Bad Request { error: "กรุณาเลือกขนาดเครื่องดื่ม" }
        Route-->>Screen: 400 Bad Request
        Screen-->>Cashier: แสดง Modal เตือนข้อมูลไม่ครบถ้วน
    else ข้อมูลถูกต้องครบถ้วน (Main Flow)
        loop ตรวจสอบและคำนวณราคาทุกรายการ (FR-05)
            Ctrl->>ProdEnt: findById(productId)
            ProdEnt->>DB: SELECT * FROM products WHERE id = ?
            DB-->>ProdEnt: product
            ProdEnt-->>Ctrl: product

            Ctrl->>OptEnt: findById(sizeId)
            OptEnt->>DB: SELECT * FROM product_options WHERE id = ?
            DB-->>OptEnt: sizeOption
            OptEnt-->>Ctrl: sizeOption

            opt มีการเลือกท็อปปิง
                Ctrl->>OptEnt: findByIds(toppingIds)
                OptEnt->>DB: SELECT * FROM product_options WHERE id IN (?)
                DB-->>OptEnt: toppings[]
                OptEnt-->>Ctrl: toppings[]
            end

            Note over Ctrl: unitPrice = parseFloat(base_price) + size + toppings<br/>subtotal = unitPrice * quantity<br/>totalAmount += subtotal
        end

        Ctrl->>OrderEnt: getLastQueueNoToday()
        OrderEnt->>DB: SELECT MAX(queue_no) FROM orders WHERE DATE(created_at) = CURDATE()
        DB-->>OrderEnt: last_queue (เช่น 1)
        OrderEnt-->>Ctrl: last_queue
        Note over Ctrl: queueNo = last_queue + 1 (FR-04)<br/>orderNo = POS-YYYYMMDD-0002

        Note over Ctrl,DB: บันทึกข้อมูลด้วย MySQL Transaction (START TRANSACTION)
        Ctrl->>OrderEnt: createWithItems({ orderNo, queueNo, totalAmount, paymentMethod, items })
        activate OrderEnt
        OrderEnt->>DB: START TRANSACTION
        OrderEnt->>DB: INSERT INTO orders (order_no, queue_no, total_amount, payment_method, status, created_at)
        DB-->>OrderEnt: insertId = 2

        loop บันทึกแต่ละรายการลง order_items
            OrderEnt->>DB: INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, options_json)
        end

        alt บันทึกลงฐานข้อมูลสำเร็จสมบูรณ์
            OrderEnt->>DB: COMMIT
            OrderEnt-->>Ctrl: { id: 2, orderNo, queueNo }
            deactivate OrderEnt
            Ctrl-->>Route: 201 Created { orderId, orderNo, queueNo, totalAmount, status: "pending" }
            Route-->>Screen: 201 Created
            Screen-->>Cashier: แสดงบัตรคิว #002 + ยอดเงิน + พิมพ์สลิปใบเสร็จ (FR-06)
        else เกิดข้อผิดพลาดทางเทคนิค (Exception E3: DB Error)
            OrderEnt->>DB: ROLLBACK
            OrderEnt-->>Ctrl: throw Error
            Ctrl-->>Route: 500 Internal Server Error
            Route-->>Screen: 500 Error
            Screen-->>Cashier: แจ้งเตือนข้อผิดพลาด ไม่สร้างออเดอร์ซ้ำซ้อน
        end
    end
    deactivate Ctrl
    deactivate Route
    deactivate Screen
```

---

### แผนภาพที่ 3: บาริสต้าดูคิวแบบเรียลไทม์ และอัปเดตสถานะเครื่องดื่ม (FR-07, FR-08)

_Use Case 04: ดูคิวออเดอร์และอัปเดตสถานะ_  
_แสดงการทำงานแบบ Polling และการควบคุม State Transition ห้ามย้อนสถานะ (Exception E4)_

```mermaid
sequenceDiagram
    autonumber
    actor Barista as บาริสต้า
    participant BScreen as <<boundary>><br/>Barista Screen (UI)
    participant Route as <<boundary>><br/>orderRoutes
    participant Ctrl as <<control>><br/>orderController
    participant OrderEnt as <<entity>><br/>Order
    participant DB as <<database>><br/>MySQL (cafe_pos)

    Note over BScreen: หน้าจอบาริสต้าทำการ Polling ดึงคิวทุกๆ 3-5 วินาที (NFR-02)
    loop Polling ทุก 3-5 วินาที
        BScreen->>Route: GET /api/orders/queue
        activate Route
        Route->>Ctrl: getQueue()
        activate Ctrl
        Ctrl->>OrderEnt: findQueue()
        activate OrderEnt
        OrderEnt->>DB: SELECT * FROM orders WHERE status IN ('pending', 'cooking') ORDER BY queue_no ASC
        DB-->>OrderEnt: orders[]
        loop ดึงรายการสินค้าของแต่ละออเดอร์
            OrderEnt->>DB: SELECT * FROM order_items WHERE order_id = ?
            DB-->>OrderEnt: items[] (พร้อม options_json)
        end
        OrderEnt-->>Ctrl: ordersWithItems[]
        deactivate OrderEnt
        Ctrl-->>Route: 200 OK (Queue List)
        deactivate Ctrl
        Route-->>BScreen: 200 OK
        deactivate Route
        BScreen-->>Barista: แสดงการ์ดคิวที่ต้องทำ (เรียงลำดับคิว 1, 2, 3...)
    end

    Note over Barista: บาริสต้าหยิบออเดอร์คิว #002 เริ่มลงมือชงกาแฟ
    Barista->>BScreen: กดปุ่ม "เริ่มทำเครื่องดื่ม"
    activate BScreen
    BScreen->>Route: PATCH /api/orders/2/status { status: "cooking" }
    activate Route
    Route->>Ctrl: updateStatus(2, "cooking")
    activate Ctrl

    Ctrl->>OrderEnt: findById(2)
    OrderEnt->>DB: SELECT * FROM orders WHERE id = 2
    DB-->>OrderEnt: order (current status = 'pending')
    OrderEnt-->>Ctrl: order

    alt ลำดับสถานะถูกต้อง (pending -> cooking -> ready -> completed)
        Note over Ctrl: สถานะใหม่ 'cooking' ก้าวหน้ากว่า 'pending' (ผ่านเงื่อนไข)
        Ctrl->>OrderEnt: updateStatus(2, "cooking")
        OrderEnt->>DB: UPDATE orders SET status = 'cooking' WHERE id = 2
        DB-->>OrderEnt: success
        Ctrl-->>Route: 200 OK { id: 2, status: "cooking" }
        Route-->>BScreen: 200 OK
        BScreen-->>Barista: อัปเดตสีการ์ดเป็น "กำลังชง" ทันที
    else พยายามย้อนสถานะ (Exception E4: เช่น จาก cooking ย้อนกลับไป pending)
        Ctrl-->>Route: 400 Bad Request { error: "ไม่สามารถเปลี่ยนสถานะย้อนกลับได้" }
        Route-->>BScreen: 400 Bad Request
        BScreen-->>Barista: แจ้งเตือนไม่อนุญาตให้ย้อนสถานะ
    end
    deactivate Ctrl
    deactivate Route
    deactivate BScreen

    Note over Barista: เมื่อชงกาแฟเสร็จ บาริสต้ากด "พร้อมรับ (ready)" และ "เสร็จสิ้น (completed)"
    Barista->>BScreen: กดปุ่ม "เสร็จสิ้น (completed)"
    activate BScreen
    BScreen->>Route: PATCH /api/orders/2/status { status: "completed" }
    activate Route
    Route->>Ctrl: updateStatus(2, "completed")
    Ctrl->>OrderEnt: updateStatus(2, "completed")
    OrderEnt->>DB: UPDATE orders SET status = 'completed' WHERE id = 2
    Ctrl-->>Route: 200 OK { id: 2, status: "completed" }
    Route-->>BScreen: 200 OK
    deactivate Route
    BScreen-->>Barista: ออเดอร์คิว #002 หายออกจากหน้าจอบาริสต้า (ย้ายเข้าประวัติการขาย)
    deactivate BScreen
```

---

## 3. สรุปความเชื่อมโยงกับโค้ดจริง (Code Traceability)

| ส่วนประกอบใน Diagram            | ประเภท BCE     | ไฟล์ที่นำไปปฏิบัติจริง                     | ฟังก์ชัน/ความรับผิดชอบ                              |
| ------------------------------- | -------------- | ------------------------------------------ | --------------------------------------------------- |
| **POS Screen**                  | `<<boundary>>` | `project/frontend/cashier/`                | หน้าจอรับออเดอร์, ตะกร้าสินค้า, แสดงเลขคิว          |
| **Barista Screen**              | `<<boundary>>` | `project/frontend/barista/`                | หน้าจอดูคิวแบบ Card/Kanban, Polling ออเดอร์         |
| **orderRoutes / productRoutes** | `<<boundary>>` | `backend/routes/*.js`                      | จัดการ HTTP Request, Path, Method, Parameters       |
| **productController**           | `<<control>>`  | `backend/controllers/productController.js` | จัดกลุ่มสินค้าตามหมวดหมู่, แปลงประเภทข้อมูลทศนิยม   |
| **orderController**             | `<<control>>`  | `backend/controllers/orderController.js`   | คำนวณราคา, Validate ข้อมูล, ออกเลขคิว, ลำดับสถานะ   |
| **Product / ProductOption**     | `<<entity>>`   | `backend/entities/Product*.js`             | รันคำสั่ง SQL ดึงเมนูและตัวเลือก                    |
| **Order**                       | `<<entity>>`   | `backend/entities/Order.js`                | บันทึกออเดอร์ด้วย MySQL Transaction, ดึงรายการคิว   |
| **MySQL (cafe_pos)**            | `<<database>>` | `backend/db.js`                            | Connection Pool, ตาราง `orders`, `order_items`, ฯลฯ |
