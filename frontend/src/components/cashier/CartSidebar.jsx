/** แสดงตะกร้า ปรับจำนวน/ลบรายการ เลือกการชำระ และยืนยันการขาย */
import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const PAYMENT_METHODS = [
  { id: "cash", label: "เงินสด", icon: Banknote },
  { id: "transfer", label: "เงินโอน", icon: CreditCard },
  { id: "qr", label: "QR Code", icon: QrCode },
];

const isWarmBakeryOption = (name = "") =>
  name.includes("อุ่น") && !name.includes("ไม่ต้องอุ่น");

/** รับรายการและ callbacks จาก CashierView เพื่อจัดการขั้นตอน checkout */
export default function CartSidebar({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isSubmitting,
}) {
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");

  useEffect(() => {
    if (cartItems.length === 0) setCashReceived("");
  }, [cartItems.length]);

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const discount = Math.min(Math.max(Number(discountAmount) || 0, 0), totalAmount);
  const netAmount = Math.max(totalAmount - discount, 0);
  const receivedAmount = Number(cashReceived);
  const hasEnoughCash = selectedPayment !== "cash"
    || netAmount === 0
    || (cashReceived !== "" && Number.isInteger(receivedAmount) && receivedAmount >= netAmount);
  const changeAmount = cashReceived !== "" && Number.isFinite(receivedAmount)
    ? Math.max(receivedAmount - netAmount, 0)
    : 0;
  const quickCashAmounts = [...new Set([
    netAmount,
    ...[50, 100, 500, 1000].filter((amount) => amount >= netAmount),
  ])];

  const handleCheckoutClick = () => {
    if (cartItems.length === 0 || isSubmitting) return;
    onCheckout({
      paymentMethod: selectedPayment,
      cashReceived: selectedPayment === "cash" ? (netAmount === 0 ? 0 : receivedAmount) : null,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        temperatureId: item.temperatureId,
        temperatureName: item.temperatureName,
        sizeId: item.sizeId,
        sizeName: item.sizeName,
        sweetnessId: item.sweetnessId,
        sweetnessName: item.sweetnessName,
        toppingIds: item.toppingIds || [],
        toppingNames: item.toppingNames || [],
        bakeryOptionId: item.bakeryOptionId,
        bakeryOptionName: item.bakeryOptionName,
      })),
      discountAmount: discount,
    });
  };

  return (
    <aside className="cart-sidebar">
      {/* Cart Header */}
      <div className="cart-header">
        <div className="cart-header-title">
          <ShoppingCart size={22} className="cart-header-icon" />
          <h2>รายการสั่งซื้อ</h2>
          {totalQuantity > 0 && (
            <span className="cart-item-count">{totalQuantity}</span>
          )}
        </div>

        {cartItems.length > 0 && (
          <button
            className="clear-cart-btn"
            onClick={onClearCart}
            title="ล้างรายการทั้งหมด"
          >
            <Trash2 size={16} />
            <span>ล้าง</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="cart-items-list custom-scroll">
        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon-circle">
              <ShoppingCart size={32} />
            </div>
            <p className="cart-empty-title">ยังไม่มีสินค้าในตะกร้า</p>
            <p className="cart-empty-desc">
              คลิกเลือกเมนูจากทางซ้าย เพื่อปรับแต่งขนาดและท็อปปิง
            </p>
          </div>
        ) : (
          cartItems.map((item, index) => (
            <div
              key={`${item.productId}-${item.temperatureId || "t"}-${item.sizeId || "s"}-${item.bakeryOptionId || "b"}-${index}`}
              className="cart-item-card"
            >
              <div className="cart-item-top">
                <span className="cart-item-name">{item.product.name}</span>
                <span className="cart-item-subtotal">
                  ฿{item.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Customization Badges */}
              <div className="cart-item-badges">
                {item.isBakery ? (
                  <>
                    <span className="cart-badge bakery">🥐 เบเกอรี่</span>
                    {item.bakeryOptionName && (
                      <span
                        className={`cart-badge ${isWarmBakeryOption(item.bakeryOptionName) ? "bakery-warm" : "bakery-normal"}`}
                      >
                        {isWarmBakeryOption(item.bakeryOptionName)
                          ? " อุ่นร้อน"
                          : " ไม่ต้องอุ่น"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {item.temperatureName && (
                      <span
                        className={`cart-badge temp ${item.temperatureName.includes("ร้อน") ? "hot" : item.temperatureName.includes("ปั่น") ? "frappe" : "iced"}`}
                      >
                        {item.temperatureName.includes("ร้อน")
                          ? " ร้อน"
                          : item.temperatureName.includes("ปั่น")
                            ? "ปั่น"
                            : "เย็น"}
                      </span>
                    )}
                    {item.sizeName && (
                      <span className="cart-badge size">{item.sizeName}</span>
                    )}
                    {item.sweetnessName && (
                      <span className="cart-badge sweetness">
                        {item.sweetnessName.match(/\d+\s*%/)?.[0]
                          ? `หวาน ${item.sweetnessName.match(/\d+\s*%/)[0]}`
                          : item.sweetnessName}
                      </span>
                    )}
                    {item.toppingNames && item.toppingNames.length > 0 && (
                      <span className="cart-badge topping">
                        +{item.toppingNames.join(", ")}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Item Controls */}
              <div className="cart-item-controls">
                <span className="unit-price-hint">
                  ฿{item.unitPrice.toFixed(2)} /{" "}
                  {item.isBakery ? "ชิ้น" : "แก้ว"}
                </span>

                <div className="qty-control-compact">
                  <button
                    className="qty-btn-sm"
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button
                    className="qty-btn-sm"
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    className="remove-item-btn"
                    onClick={() => onRemoveItem(index)}
                    title="ลบรายการนี้"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      {cartItems.length > 0 && (
        <div className="cart-footer">
          {/* Payment Method Selector (FR-06) */}
          <div className="payment-method-section">
            <span className="payment-label">วิธีชำระเงิน</span>
            <div className="payment-methods-grid">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPayment === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    className={`payment-pill ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <Icon size={16} />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="cart-pricing-breakdown">
            <div className="pricing-row">
              <label htmlFor="cart-discount">ส่วนลด (บาท)</label>
              <input
                id="cart-discount"
                type="number"
                min="0"
                max={totalAmount}
                step="1"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                aria-label="ส่วนลดเป็นบาท"
              />
            </div>
            <div className="pricing-row total">
              <span>ยอดสุทธิรวม</span>
              <span className="total-highlight">฿{netAmount.toFixed(2)}</span>
            </div>
          </div>

          {selectedPayment === "cash" && (
            <div className="cash-tender-panel">
              <label className="cash-tender-field" htmlFor="cash-received">
                <span>รับเงินมา</span>
                <span className="cash-tender-input-wrap">
                  <span aria-hidden="true">฿</span>
                  <input
                    id="cash-received"
                    type="number"
                    min={netAmount}
                    step="1"
                    inputMode="numeric"
                    placeholder="จำนวนเงิน"
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                    aria-describedby="cash-change-status"
                  />
                </span>
              </label>
              <div className="cash-quick-amounts" aria-label="จำนวนเงินด่วน">
                {quickCashAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={amount === netAmount ? "is-exact" : ""}
                    onClick={() => setCashReceived(String(amount))}
                  >
                    {amount === netAmount ? "พอดี" : `฿${amount.toLocaleString("th-TH")}`}
                  </button>
                ))}
              </div>
              <div
                className={`cash-change-row ${cashReceived !== "" && receivedAmount < netAmount ? "is-short" : ""}`}
                id="cash-change-status"
                role="status"
                aria-live="polite"
              >
                <span>{cashReceived === "" ? "เงินทอน" : receivedAmount < netAmount ? "รับเงินยังไม่ครบ" : "เงินทอน"}</span>
                <strong>
                  {netAmount === 0
                    ? "฿0.00"
                    : cashReceived === ""
                    ? "กรอกจำนวนเงิน"
                    : receivedAmount < netAmount
                      ? `ขาด ฿${(netAmount - receivedAmount).toFixed(2)}`
                      : `฿${changeAmount.toFixed(2)}`}
                </strong>
              </div>
            </div>
          )}

          {/* Submit Checkout Button */}
          <button
            className="checkout-btn"
            onClick={handleCheckoutClick}
            disabled={isSubmitting || cartItems.length === 0 || !hasEnoughCash}
          >
            {isSubmitting ? (
              <span>กำลังบันทึกออเดอร์...</span>
            ) : (
              <>
                <span>ยืนยันการสั่งซื้อ</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
