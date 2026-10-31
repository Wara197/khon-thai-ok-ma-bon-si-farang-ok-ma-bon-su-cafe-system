/** กำหนด HTTP endpoints สำหรับ login ตรวจ session ปัจจุบัน และ logout */
const express = require("express");
const controller = require("../controllers/authController");
const { authenticate } = require("../auth/middleware");

const router = express.Router();
// เส้นทาง login ไม่ต้องมี session; /me และ logout ต้องยืนยัน session ก่อน
router.post("/login", async (req, res, next) => {
  try { await controller.login(req, res); } catch (error) { next(error); }
});
router.get("/me", authenticate, controller.currentUser);
router.post("/logout", authenticate, async (req, res, next) => {
  try { await controller.logout(req, res); } catch (error) { next(error); }
});

module.exports = router;
