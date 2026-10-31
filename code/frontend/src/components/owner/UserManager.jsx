/** หน้าจัดการบัญชีพนักงานสำหรับ owner: เพิ่ม ปิด/เปิด และ reset password */
import React, { useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserRound, UserX, Save, Store } from "lucide-react";
import { createUser, fetchUsers, resetUserPassword, setUserActive, setUserBranch } from "../../services/api";

const roleLabels = { owner: "เจ้าของร้าน", cashier: "แคชเชียร์", barista: "บาริสต้า" };

/** แสดงบัญชีตาม role และเรียก API ที่ backend ตรวจสิทธิ์ซ้ำอีกชั้น */
export default function UserManager({ currentUser, branches = [] }) {
  // หน้านี้เรียก API จัดการบัญชี; backend ยังคงตรวจ role owner ซ้ำทุกคำขอ
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "cashier", branchId: 1 });
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [branchDrafts, setBranchDrafts] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    // โหลดรายชื่อจาก backend เพื่อให้สถานะบัญชีที่แสดงเป็นข้อมูลจริงจากฐานข้อมูล
    try { setUsers(await fetchUsers()); setError(""); }
    catch (loadError) { setError(loadError.message); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await createUser({ ...form, branchId: Number(form.branchId) });
      setForm({ username: "", password: "", role: "cashier", branchId: branches[0]?.id || 1 });
      setNotice("สร้างบัญชีพนักงานแล้ว"); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (user) => {
    setError(""); setNotice("");
    // สลับสถานะใช้งาน; backend จะเพิกถอน session เดิมเมื่อปิดบัญชี
    try { await setUserActive(user.id, !user.is_active); setNotice(`อัปเดตบัญชี ${user.username} แล้ว`); await load(); }
    catch (saveError) { setError(saveError.message); }
  };

  const resetPassword = async (user) => {
    const password = passwordDrafts[user.id] || "";
    setError(""); setNotice("");
    // หลังเปลี่ยนสำเร็จ ล้างรหัสผ่านที่ค้างในฟอร์ม; backend ยกเลิก session เก่าของบัญชีนั้น
    try { await resetUserPassword(user.id, password); setPasswordDrafts((current) => ({ ...current, [user.id]: "" })); setNotice(`เปลี่ยนรหัสผ่าน ${user.username} แล้ว ระบบจะให้เข้าสู่ระบบใหม่`); }
    catch (saveError) { setError(saveError.message); }
  };

  const saveBranch = async (user) => {
    const branchId = Number(branchDrafts[user.id] ?? user.branch_id);
    setError(""); setNotice("");
    try { await setUserBranch(user.id, branchId); setNotice(`กำหนดสาขาให้ ${user.username} แล้ว · บัญชีนี้ต้องเข้าสู่ระบบใหม่`); await load(); }
    catch (saveError) { setError(saveError.message); }
  };

  return <section className="staff-manager owner-section-box">
    <div className="section-box-header"><div className="box-title-group"><ShieldCheck size={20} /><h2>บัญชีและสิทธิ์พนักงาน</h2></div><button type="button" className="owner-queue-action" onClick={load}><RefreshCw size={15} /> โหลดใหม่</button></div>
    <p className="staff-manager-intro">กำหนดสิทธิ์ตามหน้าที่ พนักงานจะเห็นเฉพาะหน้าจอและ API ที่เกี่ยวข้อง</p>
    {error && <p className="staff-message error" role="alert">{error}</p>}{notice && <p className="staff-message success" role="status">{notice}</p>}
    <form className="staff-create-form" onSubmit={submit}>
      <label>ชื่อผู้ใช้<input required minLength="3" maxLength="32" pattern="[a-zA-Z0-9._-]+" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="เช่น cashier01" /></label>
      <label>รหัสผ่านเริ่มต้น<input required minLength="12" maxLength="200" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="อย่างน้อย 12 ตัวอักษร" /></label>
      <label>บทบาท<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="cashier">แคชเชียร์</option><option value="barista">บาริสต้า</option><option value="owner">เจ้าของร้าน</option></select></label>
      {form.role !== "owner" && <label>สาขาประจำ<select required value={form.branchId} onChange={(event) => setForm({ ...form, branchId: Number(event.target.value) })}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
      <button type="submit" disabled={busy}><Plus size={16} />{busy ? "กำลังสร้าง…" : "เพิ่มบัญชี"}</button>
    </form>
    <div className="staff-list">{users.map((user) => {
      const branchValue = branchDrafts[user.id] ?? user.branch_id ?? "";
      const branchChanged = Number(branchValue) !== Number(user.branch_id);
      return <article className={`staff-row ${user.is_active ? "" : "inactive"}`} key={user.id}>
        <div className="staff-identity">
          <span className="staff-avatar"><UserRound size={18} /></span>
          <div className="staff-identity-copy">
            <strong>{user.username}{user.id === currentUser?.id ? " (คุณ)" : ""}</strong>
            <span>{roleLabels[user.role]} · {user.role === "owner" ? "ทุกสาขา" : (user.branch_name || "ยังไม่กำหนดสาขา")}</span>
          </div>
          <span className={`staff-status ${user.is_active ? "active" : "disabled"}`}>{user.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span>
        </div>
        {user.role !== "owner" && <div className="staff-branch-assignment">
          <label><span><Store size={13} /> สาขาประจำ</span><select value={branchValue} onChange={(event) => setBranchDrafts((current) => ({ ...current, [user.id]: Number(event.target.value) }))}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <button type="button" className="staff-save-branch" disabled={!branchChanged} onClick={() => saveBranch(user)}><Save size={14} /> บันทึก</button>
        </div>}
        {user.id !== currentUser?.id && <div className="staff-actions">
          <div className="staff-password-reset"><input aria-label={`รหัสผ่านใหม่สำหรับ ${user.username}`} type="password" minLength="12" maxLength="200" autoComplete="new-password" placeholder="รหัสผ่านใหม่ (12+ ตัว)" value={passwordDrafts[user.id] || ""} onChange={(event) => setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))} /><button type="button" disabled={(passwordDrafts[user.id] || "").length < 12} onClick={() => resetPassword(user)}><KeyRound size={14} /> เปลี่ยนรหัส</button></div>
          <button type="button" className="staff-toggle" onClick={() => toggleActive(user)}><UserX size={14} />{user.is_active ? "ปิดบัญชี" : "เปิดบัญชี"}</button>
        </div>}
      </article>;
    })}</div>
  </section>;
}
