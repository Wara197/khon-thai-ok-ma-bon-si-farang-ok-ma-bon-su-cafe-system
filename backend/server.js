const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const { authenticate } = require("./auth/middleware");

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()) : []),
]);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "30mb" }));                  // รับ JSON body พร้อมรองรับรูปภาพ base64 ขนาดใหญ่
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));
app.use(express.static(path.join(__dirname, "public")));   // Serve static files

// ---------------------------------------------------------------------------
// Mount Routes (Boundary Layer)
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes); // เส้นทางเข้าสู่ระบบและตรวจบัญชีถูกประกาศก่อนตัวตรวจ session กลาง
app.use("/api", authenticate); // API อื่นทั้งหมดต้องมี session ของบัญชีที่ยัง active
app.use("/api", userRoutes); // Owner-only account administration.
app.use("/api", productRoutes);   // GET  /api/products
app.use("/api", orderRoutes);     // POST /api/orders, GET /api/orders/queue, PATCH /api/orders/:id/status
app.use("/api", inventoryRoutes); // GET/PUT /api/inventory

// SPA Fallback for React Frontend
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// ---------------------------------------------------------------------------
// Start Server — setup DB ก่อนเปิดรับ request
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

db.setup().then(() => {
  app.listen(PORT, () => {
    console.log(`☕ Coffee Shop POS Backend running at http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/products`);
  });
}).catch((err) => {
  console.error("❌ Failed to setup database:", err);
  process.exit(1);
});
