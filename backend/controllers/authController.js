const { all, get, run } = require("../db");
const { hashPassword, verifyPassword } = require("../auth/passwords");
const { createSession, revokeSession, sessionCookie } = require("../auth/middleware");

const SESSION_MAX_AGE = 12 * 60 * 60;
const attempts = new Map();
const roles = new Set(["owner", "cashier", "barista"]);

// ทำให้ชื่อบัญชีเทียบกันได้สม่ำเสมอ และจำกัดรูปแบบที่รับจากผู้ใช้
function normalizeUsername(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validUsername(username) {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 200;
}

async function login(req, res) {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  // จำกัดการลองเข้าสู่ระบบต่อ IP ในช่วง 15 นาที เพื่อลดการเดารหัสผ่านซ้ำ ๆ
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที" });
  recent.push(now);
  attempts.set(ip, recent);

  const user = validUsername(username) ? await get("SELECT * FROM users WHERE username = ?", [username]) : null;
  // ใช้ dummy salt/hash เมื่อไม่พบ username เพื่อให้เส้นทางตรวจรหัสผ่านใกล้เคียงกัน
  const passwordMatches = typeof password === "string"
    ? await verifyPassword(password, user?.password_salt || "00000000000000000000000000000000", user?.password_hash || "0".repeat(128))
    : false;
  if (!user || !passwordMatches || !user.is_active) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน" });
  }

  attempts.delete(ip);
  const { token } = await createSession(user.id);
  res.setHeader("Set-Cookie", sessionCookie(token, SESSION_MAX_AGE));
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
}

async function logout(req, res) {
  await revokeSession(req);
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  res.json({ ok: true });
}

function currentUser(req, res) {
  res.json({ user: req.user });
}

async function listUsers(req, res) {
  const users = await all("SELECT id, username, role, is_active, created_at FROM users ORDER BY username COLLATE NOCASE");
  res.json({ users });
}

async function createUser(req, res) {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  const role = req.body?.role;
  if (!validUsername(username)) return res.status(400).json({ error: "ชื่อผู้ใช้ต้องยาว 3–32 ตัว และใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง" });
  if (!validatePassword(password)) return res.status(400).json({ error: "รหัสผ่านต้องมีความยาว 12–200 ตัวอักษร" });
  if (!roles.has(role)) return res.status(400).json({ error: "บทบาทไม่ถูกต้อง" });
  const { salt, hash } = await hashPassword(password);
  try {
    const result = await run("INSERT INTO users (username, password_hash, password_salt, role) VALUES (?, ?, ?, ?)", [username, hash, salt, role]);
    res.status(201).json({ user: { id: result.lastID, username, role, is_active: 1 } });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || /UNIQUE constraint failed/i.test(error.message)) return res.status(409).json({ error: "มีชื่อผู้ใช้นี้แล้ว" });
    throw error;
  }
}

async function setUserActive(req, res) {
  const id = Number(req.params.id);
  const isActive = req.body?.isActive;
  if (!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean") return res.status(400).json({ error: "ข้อมูลบัญชีไม่ถูกต้อง" });
  if (id === req.user.id && !isActive) return res.status(400).json({ error: "ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่ได้" });
  const target = await get("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!target) return res.status(404).json({ error: "ไม่พบบัญชีผู้ใช้" });
  // ป้องกันการล็อกตัวเองออก และรักษาบัญชี owner ที่ active ไว้อย่างน้อยหนึ่งบัญชี
  if (!isActive && target.role === "owner") {
    const { count } = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner' AND is_active = 1");
    if (count <= 1) return res.status(400).json({ error: "ต้องมีบัญชีเจ้าของร้านที่เปิดใช้งานอย่างน้อยหนึ่งบัญชี" });
  }
  await run("UPDATE users SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
  if (!isActive) await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  res.json({ id, is_active: isActive ? 1 : 0 });
}

async function resetPassword(req, res) {
  const id = Number(req.params.id);
  const password = req.body?.password;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "บัญชีผู้ใช้ไม่ถูกต้อง" });
  if (!validatePassword(password)) return res.status(400).json({ error: "รหัสผ่านต้องมีความยาว 12–200 ตัวอักษร" });
  const user = await get("SELECT id FROM users WHERE id = ?", [id]);
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีผู้ใช้" });
  const { salt, hash } = await hashPassword(password);
  await run("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", [hash, salt, id]);
  // บังคับให้อุปกรณ์ที่ล็อกอินด้วยรหัสผ่านเดิมต้องเข้าสู่ระบบใหม่ทั้งหมด
  await run("DELETE FROM sessions WHERE user_id = ?", [id]);
  res.json({ id, passwordReset: true });
}

module.exports = { login, logout, currentUser, listUsers, createUser, setUserActive, resetPassword };
