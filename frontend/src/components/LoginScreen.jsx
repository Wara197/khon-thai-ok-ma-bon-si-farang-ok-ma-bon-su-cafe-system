import React, { useState } from "react";
import { Coffee, LockKeyhole, LogIn } from "lucide-react";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    // ส่งข้อมูลให้ App จัดการ login; แสดง error จาก backend และกันการกดซ้ำระหว่างรอ
    setBusy(true);
    setError("");
    try { await onLogin(username, password); }
    catch (loginError) { setError(loginError.message); }
    finally { setBusy(false); }
  };

  return <main className="auth-screen">
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-brand-mark"><Coffee size={25} /></div>
      <p className="auth-eyebrow">COFFEE SHOP POS</p>
      <h1>เข้าสู่ระบบ</h1>
      <p className="auth-description">ใช้บัญชีพนักงานเพื่อเปิดหน้าทำงานตามสิทธิ์ของคุณ</p>
      <label className="auth-field"><span>ชื่อผู้ใช้</span><div><span className="auth-field-icon">@</span><input autoComplete="username" required autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ชื่อผู้ใช้" /></div></label>
      <label className="auth-field"><span>รหัสผ่าน</span><div><LockKeyhole size={17} className="auth-field-icon" /><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="รหัสผ่าน" /></div></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}><LogIn size={17} />{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
      <p className="auth-footnote">ยังไม่มีบัญชีเจ้าของร้าน? เปิด Terminal ในโฟลเดอร์ backend แล้วรัน <code>npm run create-user -- --username owner --role owner</code></p>
    </form>
  </main>;
}
