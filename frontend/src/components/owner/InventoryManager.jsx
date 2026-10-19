import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { createInventory, deleteRecipe, fetchInventory, fetchProducts, receiveInventory, saveRecipe, updateInventory } from "../../services/api";

export default function InventoryManager() {
  // แยก state ตามงานบนหน้าจอ: รายการสต็อก, สูตรต่อเมนู, และแบบฟอร์มรับสินค้าเข้า
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", stockQty: "", minThreshold: "", unit: "" });
  const [adding, setAdding] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipeForm, setRecipeForm] = useState({ productId: "", inventoryId: "", quantityPerUnit: "" });
  const [productOptions, setProductOptions] = useState({ size: [], temperature: [], bakery_option: [], sweetness: [] });
  const [movements, setMovements] = useState([]);
  const [receiveForm, setReceiveForm] = useState({});

  const load = async () => {
    // โหลดสต็อก สูตร และประวัติใหม่หลังการแก้ไข ให้ทุกส่วนแสดงข้อมูลล่าสุด
    try { const data = await fetchInventory(); setItems(data.items || []); setRecipes(data.recipes || []); setMovements(data.movements || []); setError(""); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); fetchProducts().then((data) => { setProducts((data.categories || []).flatMap((category) => category.products || [])); setProductOptions(data.options || {}); }).catch(() => {}); }, []);
  const change = (id, key, value) => setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const save = async (item) => {
    setSavingId(item.id);
    try {
      await updateInventory(item.id, { stockQty: item.stock_qty, minThreshold: item.min_threshold });
      await load();
    } catch (err) { setError(err.message); }
    finally { setSavingId(null); }
  };
  const add = async (event) => {
    event.preventDefault();
    setAdding(true);
    try {
      await createInventory(newItem);
      setNewItem({ name: "", stockQty: "", minThreshold: "", unit: "" });
      await load();
    } catch (err) { setError(err.message); }
    finally { setAdding(false); }
  };
  const saveRecipeEntry = async (event) => {
    event.preventDefault();
    // สูตรพื้นฐานใช้ optionId = 0; สูตรเฉพาะตัวเลือกส่ง id ของขนาด/อุณหภูมิ/ความหวาน/วิธีเสิร์ฟ
    try { await saveRecipe({ ...recipeForm, optionType: recipeForm.optionType || "base", optionId: recipeForm.optionType === "base" ? 0 : recipeForm.optionId }); setRecipeForm({ productId: "", inventoryId: "", quantityPerUnit: "" }); await load(); }
    catch (err) { setError(err.message); }
  };
  const receive = async (item) => {
    const quantity = Number(receiveForm[item.id]?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) { setError("ระบุจำนวนรับเข้ามากกว่า 0"); return; }
    try {
      await receiveInventory(item.id, { quantity, note: receiveForm[item.id]?.note || "" });
      setReceiveForm((current) => ({ ...current, [item.id]: { quantity: "", note: "" } }));
      await load();
    } catch (err) { setError(err.message); }
  };
  const removeRecipeEntry = async (recipe) => {
    try { await deleteRecipe(recipe.product_id, recipe.inventory_id, recipe.option_type, recipe.option_id); await load(); }
    catch (err) { setError(err.message); }
  };

  // รวมสูตรตามเมนู โดยรักษาลำดับที่ backend ส่งมาและคงการจัดการสูตรเป็นรายแถว
  const recipeGroups = [...recipes.reduce((groups, recipe) => {
    const group = groups.get(recipe.product_id) || { productId: recipe.product_id, productName: recipe.product_name, recipes: [] };
    group.recipes.push(recipe);
    groups.set(recipe.product_id, group);
    return groups;
  }, new Map()).values()];

  // ใช้หน่วยของวัตถุดิบที่เลือกกำกับช่องปริมาณ เพื่อป้องกันการบันทึกสูตรผิดหน่วย
  const selectedRecipeInventory = items.find((item) => String(item.id) === String(recipeForm.inventoryId));
  const recipeOptionType = recipeForm.optionType || "base";

  const low = items.filter((item) => Number(item.stock_qty) <= Number(item.min_threshold));
  return <section className="inventory-manager owner-section-box">
    <div className="section-box-header">
      <div className="box-title-group"><AlertTriangle size={20} /><h2>คลังวัตถุดิบ</h2></div>
      <button type="button" className="owner-queue-action" onClick={load}><RefreshCw size={15} /> โหลดใหม่</button>
    </div>
    {low.length > 0 && <p className="inventory-alert" role="alert"><AlertTriangle size={16} /> วัตถุดิบต่ำกว่าเกณฑ์: {low.map((item) => item.name).join(", ")}</p>}
    {error && <p className="inventory-alert" role="alert">{error}</p>}
    <form className="inventory-add-form" onSubmit={add}>
      <input required placeholder="ชื่อวัตถุดิบ" value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} />
      <input required type="number" min="0" placeholder="จำนวนเริ่มต้น" value={newItem.stockQty} onChange={(event) => setNewItem({ ...newItem, stockQty: event.target.value })} />
      <input required placeholder="หน่วย เช่น กรัม" value={newItem.unit} onChange={(event) => setNewItem({ ...newItem, unit: event.target.value })} />
      <input required type="number" min="0" placeholder="แจ้งเตือนที่" value={newItem.minThreshold} onChange={(event) => setNewItem({ ...newItem, minThreshold: event.target.value })} />
      <button type="submit" disabled={adding}><Plus size={15} /> {adding ? "กำลังเพิ่ม" : "เพิ่มวัตถุดิบ"}</button>
    </form>
    <div className="inventory-list">
      {items.map((item) => <div className="inventory-row" key={item.id}>
        <strong>{item.name}</strong>
        {/* จัดชื่อช่อง ตัวเลข และหน่วยเป็นกลุ่มเดียวเพื่อให้ทุกแถวอยู่แนวเดียวกัน */}
        <label className="inventory-stock-field">
          <span className="inventory-stock-label">คงเหลือ</span>
          <span className="inventory-stock-control">
            <input type="number" min="0" value={item.stock_qty} onChange={(event) => change(item.id, "stock_qty", event.target.value)} />
            <span className="inventory-stock-unit">{item.unit}</span>
          </span>
        </label>
        <label className="inventory-stock-field">
          <span className="inventory-stock-label">แจ้งเตือนที่</span>
          <span className="inventory-stock-control">
            <input type="number" min="0" value={item.min_threshold} onChange={(event) => change(item.id, "min_threshold", event.target.value)} />
            <span className="inventory-stock-unit">{item.unit}</span>
          </span>
        </label>
        <button type="button" onClick={() => save(item)} disabled={savingId === item.id}><Save size={15} /> {savingId === item.id ? "กำลังบันทึก" : "บันทึก"}</button>
        <div className="inventory-receive-controls">
          <label className="inventory-receive-quantity">
            <input aria-label={`จำนวนรับเข้า (${item.unit})`} type="number" min="0.01" step="0.01" placeholder="จำนวน" value={receiveForm[item.id]?.quantity || ""} onChange={(event) => setReceiveForm((current) => ({ ...current, [item.id]: { ...current[item.id], quantity: event.target.value } }))} />
            <span>{item.unit}</span>
          </label>
          <input className="inventory-receive-note" placeholder="หมายเหตุ (ถ้ามี)" value={receiveForm[item.id]?.note || ""} onChange={(event) => setReceiveForm((current) => ({ ...current, [item.id]: { ...current[item.id], note: event.target.value } }))} />
          <button type="button" onClick={() => receive(item)}>รับเข้า</button>
        </div>
      </div>)}
    </div>
    <section className="recipe-manager">
      <h3>สูตรใช้วัตถุดิบต่อเมนู</h3>
      <form className="recipe-form" onSubmit={saveRecipeEntry}>
        <div className={`recipe-form-fields ${recipeOptionType === "base" ? "is-base" : "has-option"}`}>
          <label className="recipe-field">
            <span>เมนู</span>
            <select required value={recipeForm.productId} onChange={(event) => setRecipeForm({ ...recipeForm, productId: event.target.value })}><option value="">เลือกเมนู</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
          </label>
          <label className="recipe-field">
            <span>วัตถุดิบ</span>
            <select required value={recipeForm.inventoryId} onChange={(event) => setRecipeForm({ ...recipeForm, inventoryId: event.target.value })}><option value="">เลือกวัตถุดิบ</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select>
          </label>
          <label className="recipe-field">
            <span>สูตรนี้ใช้กับ</span>
            <select value={recipeOptionType} onChange={(event) => setRecipeForm({ ...recipeForm, optionType: event.target.value, optionId: "" })}>
              <option value="base">ทุกตัวเลือก (สูตรพื้นฐาน)</option>
              <option value="size">ขนาดแก้ว</option>
              <option value="temperature">ประเภทเครื่องดื่ม</option>
              <option value="sweetness">ระดับความหวาน</option>
              <option value="bakery_option">วิธีเสิร์ฟเบเกอรี่</option>
            </select>
          </label>
          {recipeOptionType !== "base" && <label className="recipe-field">
            <span>ตัวเลือกที่ใช้สูตรนี้</span>
            <select required value={recipeForm.optionId || ""} onChange={(event) => setRecipeForm({ ...recipeForm, optionId: event.target.value })}><option value="">เลือกตัวเลือก</option>{(productOptions[recipeOptionType] || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
          </label>}
        </div>
        <div className="recipe-form-action">
          <label className="recipe-field recipe-quantity-field">
            <span>ปริมาณต่อ 1 รายการเมนู <small>{selectedRecipeInventory?.unit || "เลือกวัตถุดิบก่อน"}</small></span>
            <span className="recipe-quantity-control">
              <input required aria-label={`ปริมาณต่อ 1 รายการเมนู (${selectedRecipeInventory?.unit || "หน่วย"})`} type="number" min="0.01" step="0.01" placeholder="เช่น 120" value={recipeForm.quantityPerUnit} onChange={(event) => setRecipeForm({ ...recipeForm, quantityPerUnit: event.target.value })} />
              <span>{selectedRecipeInventory?.unit || "หน่วย"}</span>
            </span>
          </label>
          <button type="submit"><Plus size={15} /> บันทึกสูตร</button>
        </div>
      </form>
      {/* แสดงผลของกฎสูตรตรงกับการคำนวณจริง: สูตรเฉพาะแทนวัตถุดิบชนิดเดียวกัน ส่วนรายการอื่นยังมาจากสูตรพื้นฐาน */}
      <p className="recipe-help">{recipeOptionType === "base"
        ? "สูตรพื้นฐานใช้กับทุกตัวเลือก เว้นแต่จะกำหนดสูตรเฉพาะเพื่อแทนวัตถุดิบนั้น"
        : "สูตรเฉพาะนี้จะแทนสูตรพื้นฐานของวัตถุดิบชนิดเดียวกัน ส่วนวัตถุดิบอื่นในสูตรพื้นฐานยังคงใช้ตามเดิม"}</p>
      {recipeGroups.length ? <div className="recipe-list">
        {recipeGroups.map((group) => <section className="recipe-group" key={group.productId} aria-label={`สูตรวัตถุดิบ ${group.productName}`}>
          <div className="recipe-group-header"><h4>{group.productName}</h4><span>{group.recipes.length} สูตร</span></div>
          <div className="recipe-group-entries">{group.recipes.map((recipe) => <div key={`${recipe.inventory_id}-${recipe.option_type}-${recipe.option_id}`} className="recipe-row">
            <span className="recipe-scope">{recipe.option_type === "base" ? "ทุกตัวเลือก" : recipe.option_name || "ตัวเลือก"}</span>
            <span className="recipe-usage"><strong>{recipe.inventory_name}</strong><span><b>{recipe.quantity_per_unit} {recipe.unit}</b> ต่อ 1 รายการเมนู</span></span>
            <button type="button" onClick={() => removeRecipeEntry(recipe)} aria-label={`ลบสูตร ${group.productName}: ${recipe.inventory_name}`}><Trash2 size={15} /></button>
          </div>)}</div>
        </section>)}
      </div> : <p className="recipe-empty">ยังไม่มีสูตรวัตถุดิบ เพิ่มสูตรจากแบบฟอร์มด้านบน</p>}
    </section>
    <section className="inventory-history">
      <h3>ประวัติความเคลื่อนไหวล่าสุด</h3>
      {movements.length ? <div className="inventory-history-list">{movements.map((movement) => <div key={movement.id} className="inventory-history-row"><strong>{movement.inventory_name}</strong><span>{movement.reason.startsWith("stock_received") ? "รับเข้า" : movement.reason === "order_created" ? "ตัดสต็อก · ออเดอร์" : movement.reason === "order_cancelled" ? "คืนสต็อก · ยกเลิกออเดอร์" : "ปรับยอด"}{movement.reason.includes(": ") ? ` · ${movement.reason.split(": ").slice(1).join(": ")}` : ""}</span><b className={movement.change_qty < 0 ? "is-decrease" : "is-increase"}>{movement.change_qty > 0 ? "+" : ""}{movement.change_qty} {movement.unit}</b><time>{new Date(movement.created_at.replace(" ", "T")).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</time></div>)}</div> : <p>ยังไม่มีประวัติรับเข้า/ตัด/คืนวัตถุดิบ</p>}
    </section>
  </section>;
}
