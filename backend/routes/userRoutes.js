const express = require("express");
const controller = require("../controllers/authController");
const { requireRoles } = require("../auth/middleware");

const router = express.Router();
// การจัดการบัญชีพนักงานเป็นสิทธิ์ของ owner เท่านั้น ตรวจ role ก่อนเข้า controller ทุกครั้ง
router.get("/users", requireRoles("owner"), async (req, res, next) => {
  try { await controller.listUsers(req, res); } catch (error) { next(error); }
});
router.post("/users", requireRoles("owner"), async (req, res, next) => {
  try { await controller.createUser(req, res); } catch (error) { next(error); }
});
router.patch("/users/:id/active", requireRoles("owner"), async (req, res, next) => {
  try { await controller.setUserActive(req, res); } catch (error) { next(error); }
});
router.patch("/users/:id/password", requireRoles("owner"), async (req, res, next) => {
  try { await controller.resetPassword(req, res); } catch (error) { next(error); }
});

module.exports = router;
