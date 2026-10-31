/** สคริปต์ CLI สำหรับสร้างบัญชีผู้ใช้โดยไม่แสดงรหัสผ่านระหว่างพิมพ์ */
const db = require("./db");
const { hashPassword } = require("./auth/passwords");

/** อ่านข้อความลับจาก terminal โดยปิด echo และรองรับการยกเลิกด้วย Ctrl+C */
function readHidden(promptText) {
  // อ่านรหัสผ่านใน terminal โดยไม่ echo ตัวอักษรลงหน้าจอ
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(promptText);
    let value = "";
    const wasRaw = Boolean(stdin.isRaw);
    if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk) => {
      const char = chunk.toString("utf8");
      if (char === "\u0003") process.exit(130);
      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        stdin.removeListener("data", onData);
        if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(wasRaw);
        resolve(value);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else if (char >= " ") {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

/** ตรวจ arguments ยืนยันรหัสผ่าน และเพิ่มบัญชีแรก/บัญชีฉุกเฉินใน SQLite */
async function main() {
  // ใช้สร้างบัญชีแรกหรือบัญชีฉุกเฉินจาก terminal โดยไม่ฝังรหัสเริ่มต้นไว้ใน source code
  const usernameArg = process.argv.find((arg) => arg.startsWith("--username="))?.split("=").slice(1).join("=") || "";
  const roleArg = process.argv.find((arg) => arg.startsWith("--role="))?.split("=").slice(1).join("=") || "";
  const username = usernameArg.trim().toLowerCase();
  const role = roleArg.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("ระบุ --username ที่ยาว 3–32 ตัว ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง");
  if (!["owner", "cashier", "barista"].includes(role)) throw new Error("ระบุ --role เป็น owner, cashier หรือ barista");
  if (!process.stdin.isTTY) throw new Error("คำสั่งนี้ต้องรันใน terminal แบบ interactive เพื่อป้อนรหัสผ่านแบบไม่แสดงข้อความ");

  await db.setup();
  const existing = await db.get("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) throw new Error("มีชื่อผู้ใช้นี้แล้ว");
  const password = await readHidden("รหัสผ่านใหม่ (อย่างน้อย 12 ตัว): ");
  const confirmation = await readHidden("ยืนยันรหัสผ่าน: ");
  if (password.length < 12 || password.length > 200) throw new Error("รหัสผ่านต้องมีความยาว 12–200 ตัวอักษร");
  if (password !== confirmation) throw new Error("รหัสผ่านทั้งสองครั้งไม่ตรงกัน");
  const { salt, hash } = await hashPassword(password);
  await db.run("INSERT INTO users (username, password_hash, password_salt, role, branch_id) VALUES (?, ?, ?, ?, ?)", [username, hash, salt, role, role === "owner" ? null : 1]);
  console.log(`สร้างบัญชี ${username} (${role}) สำเร็จ`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
