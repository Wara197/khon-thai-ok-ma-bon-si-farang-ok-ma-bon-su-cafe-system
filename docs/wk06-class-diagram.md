# Class Diagram ของระบบตาม Source

**สัปดาห์:** 06 — Object-Oriented Analysis & Design
**แหล่งอ้างอิง:** source ใน `project/backend/`
**รายละเอียดข้อจำกัด:** [as-built reverse-engineering](./as-built-reverse-engineering.md)

```mermaid
classDiagram
  direction TB

  class productRoutes {
    <<boundary>>
    +GET /api/products
    +GET /api/categories
    +POST /api/products
    +PUT /api/products/:id
    +DELETE /api/products/:id
    +POST /api/upload
  }
  class orderRoutes {
    <<boundary>>
    +POST /api/orders
    +GET /api/orders/queue
    +GET /api/orders/queue/stats
    +PATCH /api/orders/:id/status
    +DELETE /api/orders/:id
    +GET /api/reports/sales
    +GET /api/orders/report
    +GET /api/branches
  }
  class inventoryRoutes {
    <<boundary>>
    +GET /api/inventory
    +POST /api/inventory
    +PUT /api/inventory/:id
    +POST /api/inventory/:id/receive
    +PUT /api/recipes
    +DELETE /api/recipes/:productId/:inventoryId/:optionType/:optionId
  }
  class authRoutes {
    <<boundary>>
    +POST /api/auth/login
    +GET /api/auth/me
    +POST /api/auth/logout
  }
  class userRoutes {
    <<boundary>>
    +GET/POST /api/users
    +PATCH /api/users/:id/active
    +PATCH /api/users/:id/password
  }
  class productController {
    <<control>>
    +listProducts()
    +listCategories()
    +createProduct(data)
    +updateProduct(id,data)
    +deleteProduct(id)
  }
  class orderController {
    <<control>>
    +createOrder(data)
    +getQueue(branchId)
    +getQueueStats(branchId)
    +updateStatus(orderId,status)
    +cancelOrder(orderId)
    +getSalesReport(branchId,period)
  }
  class inventoryController {
    <<control>>
    +listInventory()
    +listStockOverview()
    +createInventory(data)
    +updateInventory(id,data)
    +receiveInventory(id,data)
    +saveRecipe(data)
    +removeRecipe(productId,inventoryId,optionType,optionId)
  }
  class authController {
    <<control>>
    +login(req,res)
    +currentUser(req,res)
    +logout(req,res)
    +listUsers(req,res)
    +createUser(req,res)
    +setUserActive(req,res)
    +resetPassword(req,res)
  }
  class authMiddleware {
    <<security>>
    +authenticate(req,res,next)
    +requireRoles(roles)
    +createSession(userId)
    +revokeSession(req)
  }
  class Branch {
    <<entity>>
    +findAll()
    +findById(id)
  }
  class Category {
    <<entity>>
    +findAll()
    +findById(id)
  }
  class Product {
    <<entity>>
    +preparation_instructions TEXT
    +findAllActive()
    +findById(id)
    +create(data)
    +update(id,data)
    +delete(id)
  }
  class ProductOption {
    <<entity>>
    +findAll()
    +findById(id)
    +findByIds(ids)
  }
  class Order {
    <<entity>>
    +getLastQueueNoToday()
    +create(data)
    +createItem(data)
    +findQueue(branchId)
    +getQueueStats(branchId)
    +findById(id)
    +updateStatus(id,status)
    +getSalesReport(branchId,period)
  }
  class Inventory {
    <<entity>>
    +create(data)
    +findAll()
    +findStockOverview()
    +findRequirements(items,connection)
    +getMovements(limit)
    +getRecipes()
    +setRecipe(productId,inventoryId,optionType,optionId,quantity)
    +receiveStock(id,quantity,note)
  }
  class Database {
    <<database>>
    +run(sql,params)
    +get(sql,params)
    +all(sql,params)
    +setup()
  }

  productRoutes --> productController
  orderRoutes --> orderController
  inventoryRoutes --> inventoryController
  authRoutes --> authController
  userRoutes --> authController
  authRoutes --> authMiddleware
  orderRoutes --> authMiddleware
  productRoutes --> authMiddleware
  inventoryRoutes --> authMiddleware
  orderRoutes --> Branch : branch listing route
  productController --> Product
  productController --> Category
  productController --> ProductOption
  orderController --> Product
  orderController --> ProductOption
  orderController --> Order
  orderController --> Inventory
  inventoryController --> Inventory
  Branch --> Database
  Category --> Database
  Product --> Database
  ProductOption --> Database
  Order --> Database
  Inventory --> Database
```

`Product` เก็บคำแนะนำวิธีชงที่เจ้าของร้านแก้ไขได้; `Order.createItem()` รับ snapshot ใน `options_json` ผ่าน `orderController` เพื่อให้ข้อมูลคงเดิมในคิวที่สร้างแล้ว

## Object Diagram จากข้อมูล Seed

แผนภาพนี้เป็น snapshot เชิงตัวอย่างที่ผูกกับข้อมูล seed ใน `backend/db.js` ไม่ใช่ข้อมูลจากการสั่งซื้อสดใน runtime: seed สร้างสินค้า ID 3 เป็นลาเต้, สร้าง order ตัวอย่างเลข `ORD-20261018-001` และผูก order item จำนวน 2 แก้ว ราคาแก้วละ 70 บาท ยอด 140 บาท ตัวแปร primary key ของ order และ item ขึ้นกับฐานข้อมูลที่เริ่มต้น จึงแสดงเป็น `sampleOrder` และ `sampleLine` แทนการสมมติ ID ทั้งนี้สาขาไม่ได้ระบุใน seed order โดยตรงและมีค่า default เป็นสาขา 1.

```mermaid
flowchart LR
  order["sampleOrder<br/>order_no: ORD-20261018-001<br/>branch_id: 1 (default)<br/>queue_no: 1<br/>total_amount: 140 THB<br/>payment: qr<br/>status: completed"]
  line["sampleLine<br/>quantity: 2<br/>product_id: 3<br/>unit_price: 70 THB<br/>subtotal: 140 THB<br/>size: M (+10)<br/>sweetness: หวาน 50%<br/>toppings: none"]
  latte["latte<br/>id: 3<br/>ลาเต้ (Latte)<br/>base_price: 60 THB"]
  order -->|contains| line
  line -->|references product| latte
```

ค่าที่แสดงอ้างจาก `seedSampleOrders()` และ `seedMockData()`; เวลา `created_at` ถูกสร้างแบบ relative จากเวลาที่ seed ทำงานจึงไม่กำหนดเป็นค่าคงที่ใน diagram นี้

## การตีความ

Class diagram สรุป boundary/control/entity/security ของ backend ที่มีจริง ไม่ได้แสดง frontend React components เพื่อให้เห็น backend BCM ชัดเจน เส้นทาง upload และ branch listing ทำงานใน route โดยตรง ไม่มีเมธอดใน controller. `Order.getSalesReport()` เป็น query ที่รวมรายงานอยู่ใน Entity ด้วย จึงไม่ใช่ Entity ที่มีแต่ CRUD อย่างเดียว. Inventory GET แยก `listStockOverview()` สำหรับ role barista ออกจาก response รายละเอียดสำหรับ owner; mutation ยัง owner-only. Object Diagram แสดง seed fixture ที่ระบุแหล่งไว้ ไม่ใช่หลักฐานของ order ปัจจุบันหรือผลทดสอบ runtime
