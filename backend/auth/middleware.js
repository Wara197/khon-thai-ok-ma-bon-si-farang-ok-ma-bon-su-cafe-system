const crypto = require("crypto");
const { get, run } = require("../db");

const SESSION_COOKIE = "coffee_pos_session";

// อ่าน cookie เองโดยไม่ต้องพึ่ง middleware เพิ่ม และรองรับค่า token ที่ encode ไว้
function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function sessionCookie(token, maxAgeSeconds) {
  // ป้องกัน JavaScript ฝั่งหน้าเว็บอ่าน token; เพิ่ม Secure เมื่อให้บริการผ่าน HTTPS ใน production
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

async function authenticate(req, res, next) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    }
    // ฐานข้อมูลเก็บเฉพาะ hash ของ token; token จริงอยู่ใน cookie ของผู้ใช้เท่านั้น
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await get(
      `SELECT users.id, users.username, users.role
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now') AND users.is_active = 1`,
      [tokenHash],
    );
    if (!user) return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    // 401 หมายถึงยังไม่มี session; 403 หมายถึงเข้าสู่ระบบแล้วแต่ role ไม่ได้รับอนุญาต
    if (!req.user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้" });
    next();
  };
}

async function createSession(userId) {
  // token สุ่ม 256 บิต ใช้งาน 12 ชั่วโมง และล้าง session เก่าที่หมดอายุระหว่างสร้าง session ใหม่
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const maxAgeSeconds = 12 * 60 * 60;
  await run("DELETE FROM sessions WHERE expires_at <= datetime('now')");
  await run("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+12 hours'))", [userId, tokenHash]);
  return { token, maxAgeSeconds };
}

async function revokeSession(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await run("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
}

module.exports = { SESSION_COOKIE, authenticate, requireRoles, createSession, revokeSession, sessionCookie };
