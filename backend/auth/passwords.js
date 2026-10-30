/** สร้างและตรวจ password hash ด้วย scrypt พร้อม salt แยกสำหรับแต่ละบัญชี */
const crypto = require("crypto");

const KEY_LENGTH = 64;
const COST = 16384;

// สร้าง salt แยกต่อบัญชี แล้วใช้ scrypt ซึ่งออกแบบมาให้เดารหัสผ่านแบบ brute force ได้ยากขึ้น
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { N: COST, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve({ salt, hash: key.toString("hex") });
    });
  });
}

async function verifyPassword(password, salt, expectedHash) {
  // คำนวณ hash ด้วย salt เดิม และเปรียบเทียบแบบใช้เวลาคงที่เพื่อลดการรั่วไหลจาก timing
  const { hash } = await hashPassword(password, salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
