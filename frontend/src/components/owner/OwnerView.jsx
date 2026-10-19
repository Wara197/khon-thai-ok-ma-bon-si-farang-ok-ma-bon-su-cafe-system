import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  QrCode,
  CreditCard,
  Banknote,
  Search,
  Flame,
  Store,
  Coffee,
  ChevronDown,
  Check,
  X,
  CalendarDays,
  ListFilter,
  Info,
  ShieldCheck,
} from "lucide-react";
import { fetchSalesReport, fetchQueueStats, fetchQueue, fetchInventory } from "../../services/api";
import MenuManager from "./MenuManager";
import InventoryManager from "./InventoryManager";
import UserManager from "./UserManager";

function OwnerDropdown({ label, value, options, onChange, className = "", icon: Icon, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex] || options[0];
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th")))
    : options;
  const menuId = `owner-dropdown-${label.replace(/\s+/g, "-")}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const focusOption = (index) => {
    const items = menuRef.current?.querySelectorAll('[role="option"]');
    if (!items?.length) return;
    const nextIndex = (index + items.length) % items.length;
    items[nextIndex].focus();
  };

  const openMenu = () => {
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
      else focusOption(Math.max(selectedIndex, 0));
    });
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = menuRef.current?.querySelectorAll('[role="option"]');
    const currentIndex = Array.from(items || []).indexOf(document.activeElement);
    if (event.target === searchRef.current && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      focusOption(event.key === "ArrowDown" ? 0 : visibleOptions.length - 1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(currentIndex + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.target !== searchRef.current && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      focusOption(event.key === "Home" ? 0 : visibleOptions.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      const focusableElements = Array.from(document.querySelectorAll(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !menuRef.current?.contains(element) && element.offsetParent !== null);
      const triggerIndex = focusableElements.indexOf(triggerRef.current);
      const nextElement = focusableElements[triggerIndex + (event.shiftKey ? -1 : 1)];
      setOpen(false);
      requestAnimationFrame(() => nextElement?.focus());
    }
  };

  const selectOption = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`owner-dropdown ${className}`} ref={rootRef}>
      <span className="owner-dropdown-label" id={`${menuId}-label`}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`owner-dropdown-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${menuId}-label ${menuId}-value`}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        {Icon && <Icon size={16} className="owner-dropdown-icon" aria-hidden="true" />}
        <span className="owner-dropdown-value" id={`${menuId}-value`}>{selectedOption?.label}</span>
        <ChevronDown size={16} className={`owner-dropdown-chevron ${open ? "rotate" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="owner-dropdown-menu"
          id={menuId}
          role="presentation"
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {searchable && (
            <>
              {/* ช่องค้นหาช่วยเจ้าของที่ดูแลหลายสาขาเลือกได้โดยไม่ต้องไล่เลื่อนเมนู */}
            <div className="owner-dropdown-search-wrap">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                className="owner-dropdown-search"
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาสาขา"
                aria-label="ค้นหาสาขา"
                autoFocus
              />
            </div>
            </>
          )}
          <div role="listbox" aria-labelledby={`${menuId}-label`}>
            {visibleOptions.length ? visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`owner-dropdown-option ${option.value === value ? "selected" : ""}`}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={16} aria-hidden="true" />}
              </button>
            )) : <p className="owner-dropdown-empty">ไม่พบสาขาที่ตรงกัน</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerView({
  selectedBranch = 1,
  branches = [],
  currentUser,
}) {
  const [activeOwnerTab, setActiveOwnerTab] = useState("analytics"); // 'analytics' | 'menu' | 'inventory'
  const defaultBranch = selectedBranch ? String(selectedBranch) : "all";
  const [dashboardBranch, setDashboardBranch] = useState(
    defaultBranch
  );

  const [data, setData] = useState(null);
  const [liveQueueStats, setLiveQueueStats] = useState(null);
  const [liveQueueErrorBranch, setLiveQueueErrorBranch] = useState(null);
  const [liveQueueUpdatedAt, setLiveQueueUpdatedAt] = useState(null);
  const [waitingOrdersBranch, setWaitingOrdersBranch] = useState(null);
  const [waitingOrdersState, setWaitingOrdersState] = useState(null);
  const [waitingOrdersLoading, setWaitingOrdersLoading] = useState(false);
  const [waitingOrdersError, setWaitingOrdersError] = useState(false);
  const [dataScope, setDataScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [reportPeriod, setReportPeriod] = useState("today");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const latestRequestId = useRef(0);
  const requestController = useRef(null);
  const dataScopeRef = useRef(null);
  const queueListController = useRef(null);

  // Sync with selectedBranch when parent changes
  useEffect(() => {
    if (selectedBranch) {
      setDashboardBranch(String(selectedBranch));
    }
  }, [selectedBranch]);

  const loadData = useCallback(async (force = false) => {
    if (requestController.current && !force) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const requestScope = `${dashboardBranch}|${reportPeriod}`;
    const requestId = ++latestRequestId.current;
    if (dataScopeRef.current !== requestScope) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetchSalesReport(
        dashboardBranch === "all" ? null : dashboardBranch,
        reportPeriod,
        controller.signal
      );
      if (requestId === latestRequestId.current) {
        setData(res);
        dataScopeRef.current = requestScope;
        setDataScope(requestScope);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      if (!controller.signal.aborted && requestId === latestRequestId.current) {
        console.error("Failed to load sales report:", err);
        setError("ไม่สามารถโหลดรายงานยอดขายได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
        setRefreshing(false);
        requestController.current = null;
      }
    }
  }, [dashboardBranch, reportPeriod]);

  useEffect(() => {
    loadData(true);
    // รายงานย้อนหลังคำนวณหลาย aggregate และรายการสินค้า จึงรีเฟรชแยกจากคิวสดทุก 60 วินาที
    const interval = setInterval(() => loadData(), 60000);
    return () => {
      clearInterval(interval);
      latestRequestId.current += 1;
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [loadData]);

  useEffect(() => {
    if (activeOwnerTab !== "analytics") return undefined;
    let active = true;
    let fetching = false;
    const controller = new AbortController();
    const branchId = dashboardBranch === "all" ? null : dashboardBranch;
    const refreshQueueStats = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const stats = await fetchQueueStats(branchId, controller.signal);
        if (active) {
          setLiveQueueStats({ branch: dashboardBranch, stats });
          setLiveQueueErrorBranch(null);
          setLiveQueueUpdatedAt(new Date());
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setLiveQueueErrorBranch(dashboardBranch);
          console.warn("Failed to refresh live queue stats:", err);
        }
      } finally {
        fetching = false;
      }
    };

    // ตัวเลขคิวเปลี่ยนบ่อยกว่ายอดขาย จึงใช้ endpoint สรุปขนาดเล็กและ poll ทุก 5 วินาที
    refreshQueueStats();
    const interval = setInterval(refreshQueueStats, 5000);
    return () => {
      active = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [activeOwnerTab, dashboardBranch]);

  useEffect(() => {
    if (activeOwnerTab !== "analytics") return undefined;
    let active = true;
    const refreshInventoryAlerts = async () => {
      try {
        const result = await fetchInventory();
        if (active) setLowStockItems(result.lowStock || []);
      } catch (err) {
        console.warn("Failed to refresh inventory alerts:", err);
      }
    };
    refreshInventoryAlerts();
    const interval = setInterval(refreshInventoryAlerts, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [activeOwnerTab]);

  useEffect(() => () => queueListController.current?.abort(), [dashboardBranch]);

  const hasCurrentData = data && dataScope === `${dashboardBranch}|${reportPeriod}`;
  const liveQueueError = liveQueueErrorBranch === dashboardBranch;
  const waitingOrdersOpen = waitingOrdersBranch === dashboardBranch;

  if (loading && !hasCurrentData) {
    return (
      <div className="owner-loading-container">
        <div className="owner-spinner"></div>
        <p>กำลังโหลดข้อมูลรายงานและสถิติยอดขาย...</p>
      </div>
    );
  }

  if (error && !hasCurrentData) {
    return (
      <div className="owner-error-container">
        <AlertCircle size={48} className="text-red-500" />
        <h3>เกิดข้อผิดพลาด</h3>
        <p>{error}</p>
        <button className="owner-refresh-btn" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw size={18} /> ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  const currentData = hasCurrentData ? data : null;
  const { periodSales, comparison, completedInPeriod, queueStats: reportQueueStats, paymentBreakdown, topProducts, recentOrders } = currentData || {
    periodSales: { sales: 0, orders: 0 },
    comparison: null,
    completedInPeriod: 0,
    queueStats: { active: 0, completed: 0, cancelled: 0, pending: 0, cooking: 0, ready: 0 },
    paymentBreakdown: [],
    topProducts: [],
    recentOrders: [],
  };
  // แสดงคิวสดของสาขาปัจจุบันก่อน; ใช้ค่าจากรายงานเป็น fallback ระหว่างรอ poll แรก
  const queueStats = liveQueueStats?.branch === dashboardBranch
    ? liveQueueStats.stats
    : reportQueueStats;

  // Filter recent orders
  const filteredOrders = (recentOrders || []).filter((ord) => {
    const matchStatus = statusFilter === "all" ? true : ord.status === statusFilter;
    const matchSearch =
      searchTerm.trim() === ""
        ? true
        : ord.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `a-${ord.queue_no}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // รายการตัวเลือกสาขาสำหรับตัวกรองรายงานแดชบอร์ด
  const allBranchesList = [
    { id: "all", name: "ทุกสาขา (รวมยอดทั้งหมด)" },
    ...(branches || []),
  ];

  // ชื่อสาขาที่กำลังเลือกอยู่
  const currentBranchLabel =
    allBranchesList.find((b) => String(b.id) === String(dashboardBranch))?.name ||
    "ทุกสาขา (รวมยอดทั้งหมด)";
  const periodLabels = { today: "วันนี้", "7d": "7 วันที่ผ่านมา", "30d": "30 วันที่ผ่านมา", all: "ตลอดช่วงข้อมูล" };
  const periodLabel = periodLabels[reportPeriod];
  const hasDashboardFilters = dashboardBranch !== defaultBranch || reportPeriod !== "today" || statusFilter !== "all" || searchTerm.trim() !== "";
  const resetDashboardFilters = () => {
    setDashboardBranch(defaultBranch);
    setReportPeriod("today");
    setStatusFilter("all");
    setSearchTerm("");
  };
  // โหลดรายละเอียดคิวเมื่อเจ้าของกดดูเท่านั้น เพื่อให้การ polling ปกติดึงข้อมูลสรุปขนาดเล็กต่อไป
  const showWaitingOrders = async (force = false) => {
    if (waitingOrdersOpen && !force) {
      setWaitingOrdersBranch(null);
      return;
    }

    const branchScope = dashboardBranch;
    const controller = new AbortController();
    queueListController.current?.abort();
    queueListController.current = controller;
    setWaitingOrdersBranch(branchScope);
    setWaitingOrdersLoading(true);
    setWaitingOrdersError(false);

    try {
      const orders = await fetchQueue(branchScope === "all" ? null : branchScope, controller.signal);
      if (!controller.signal.aborted) {
        setWaitingOrdersState({
          branch: branchScope,
          orders: orders.filter((order) => order.status === "pending"),
          updatedAt: new Date(),
        });
      }
    } catch {
      if (!controller.signal.aborted) setWaitingOrdersError(true);
    } finally {
      if (queueListController.current === controller) {
        setWaitingOrdersLoading(false);
        queueListController.current = null;
      }
    }
  };
  const salesChange = comparison?.sales > 0
    ? Math.round(((periodSales.sales - comparison.sales) / comparison.sales) * 100)
    : null;

  // Calculate max qty for top products bar calculation
  const maxTopQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.total_qty)) : 1;

  // Format payment name & icon
  const getPaymentDetails = (method) => {
    switch (method) {
      case "qr":
        return { label: "PromptPay QR", icon: <QrCode size={16} />, class: "pay-qr" };
      case "cash":
        return { label: "เงินสด (Cash)", icon: <Banknote size={16} />, class: "pay-cash" };
      case "transfer":
        return { label: "โอนผ่านธนาคาร", icon: <CreditCard size={16} />, class: "pay-transfer" };
      default:
        return { label: method, icon: <DollarSign size={16} />, class: "pay-other" };
    }
  };

  // Format status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="order-badge badge-pending">รอรับออเดอร์</span>;
      case "cooking":
        return <span className="order-badge badge-cooking">กำลังชง</span>;
      case "ready":
        return <span className="order-badge badge-ready">พร้อมเสิร์ฟ</span>;
      case "completed":
        return <span className="order-badge badge-completed">เสร็จสิ้น</span>;
      case "cancelled":
        return <span className="order-badge badge-cancelled">ยกเลิกแล้ว</span>;
      default:
        return <span className="order-badge">{status}</span>;
    }
  };

  return (
    <div className="owner-dashboard-container">
      {/* Owner Sub-Navigation Tabs */}
      <div className="owner-subtabs-bar">
        <button
          className={`owner-subtab-btn ${activeOwnerTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveOwnerTab("analytics")}
        >
          <TrendingUp size={18} />
          <span>รายงานยอดขายและสถิติ</span>
        </button>

        <button
          className={`owner-subtab-btn ${activeOwnerTab === "menu" ? "active" : ""}`}
          onClick={() => setActiveOwnerTab("menu")}
        >
          <Coffee size={18} />
          <span>จัดการเมนูและราคาขาย</span>
        </button>
        <button
          className={`owner-subtab-btn ${activeOwnerTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveOwnerTab("inventory")}
        >
          <AlertCircle size={18} />
          <span>คลังวัตถุดิบ</span>
        </button>
        <button
          className={`owner-subtab-btn ${activeOwnerTab === "staff" ? "active" : ""}`}
          onClick={() => setActiveOwnerTab("staff")}
        >
          <ShieldCheck size={18} />
          <span>บัญชีพนักงาน</span>
        </button>
      </div>

      {activeOwnerTab === "menu" ? (
        <MenuManager onMenuUpdated={() => loadData(true)} />
      ) : activeOwnerTab === "inventory" ? (
        <InventoryManager />
      ) : activeOwnerTab === "staff" ? (
        <UserManager currentUser={currentUser} />
      ) : (
        <>
          {/* Dashboard Header */}
          <div className="owner-header">
            <div>
              <div className="owner-title-row">
                <div className="owner-icon-box">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h1 className="owner-main-title">แดชบอร์ดเจ้าของร้าน</h1>
                  <p className="owner-subtitle">
                    ภาพรวมยอดขาย เมนูยอดนิยม และการดำเนินงานหน้าร้าน
                  </p>
                </div>
              </div>
            </div>

            <div className="owner-header-actions">
              <OwnerDropdown
                label="สาขา"
                value={dashboardBranch}
                onChange={setDashboardBranch}
                className="owner-branch-container"
                icon={Store}
                searchable={allBranchesList.length > 4}
                options={allBranchesList.map((branch) => ({
                  value: String(branch.id),
                  label: branch.name,
                }))}
              />

              <OwnerDropdown
                label="ช่วงรายงาน"
                value={reportPeriod}
                onChange={setReportPeriod}
                className="owner-period-control"
                icon={CalendarDays}
                options={[
                  { value: "today", label: "วันนี้" },
                  { value: "7d", label: "7 วันที่ผ่านมา" },
                  { value: "30d", label: "30 วันที่ผ่านมา" },
                  { value: "all", label: "ตลอดช่วงข้อมูล" },
                ]}
              />
              <div className={`live-indicator ${error ? "is-stale" : ""}`} title={lastUpdated ? `รายงานอัปเดตล่าสุด ${lastUpdated.toLocaleTimeString("th-TH")}` : "กำลังรอข้อมูลรายงาน"}>
                <span className="live-dot"></span>
                <span>{error ? "รายงานอาจไม่ล่าสุด" : refreshing ? "กำลังอัปเดตรายงาน" : lastUpdated ? `รายงานอัปเดต ${lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : "กำลังเชื่อมต่อรายงาน"}</span>
              </div>
              <button
                className={`owner-refresh-btn ${refreshing ? "rotating" : ""}`}
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="รีเฟรชข้อมูลล่าสุด"
              >
                <RefreshCw size={16} />
                <span>รีเฟรช</span>
              </button>
              {hasDashboardFilters && (
                <button type="button" className="owner-reset-filters" onClick={resetDashboardFilters}>
                  <X size={15} /> คืนค่าตัวกรอง
                </button>
              )}
            </div>
          </div>

          {lowStockItems.length > 0 && <button type="button" className="owner-low-stock-banner" onClick={() => setActiveOwnerTab("inventory")}>
            <AlertCircle size={19} aria-hidden="true" />
            <span><strong>{lowStockItems.length} วัตถุดิบต่ำกว่าเกณฑ์</strong> · {lowStockItems.map((item) => item.name).join(", ")}</span>
            <span className="owner-low-stock-action">จัดการคลัง →</span>
          </button>}

          {error && hasCurrentData && (
            <div className="owner-stale-banner" role="status" aria-live="polite">
              <AlertCircle size={18} />
              <span>{error} กำลังแสดงข้อมูลล่าสุดที่โหลดได้{lastUpdated ? ` เมื่อ ${lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</span>
              <button type="button" onClick={() => loadData(true)} disabled={refreshing}>ลองอีกครั้ง</button>
            </div>
          )}

      <div className="owner-report-scope">
        <div className="owner-report-scope-copy">
          <span className="owner-scope-label">ขอบเขตรายงาน</span>
          <strong>{currentBranchLabel}</strong>
          <span className="owner-scope-divider" aria-hidden="true">·</span>
          <strong>{periodLabel}</strong>
          <span className="owner-scope-updated">รายงานอัปเดต {lastUpdated ? lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "กำลังโหลด"}</span>
        </div>
        <details className="owner-metric-help">
          <summary><Info size={16} aria-hidden="true" /> ความหมายตัวเลข</summary>
          <div className="owner-metric-help-content">
            <p><strong>ยอดขายและยอดเฉลี่ย</strong> นับเฉพาะบิลที่ไม่ถูกยกเลิกในช่วงที่เลือก</p>
            <p><strong>บิลเสร็จสิ้น</strong> นับออเดอร์ที่มีสถานะเสร็จสิ้นในช่วงเดียวกัน</p>
            <p><strong>คิวปัจจุบัน</strong> แสดงออเดอร์รอทำ กำลังทำ และพร้อมเสิร์ฟ ณ ขณะนี้</p>
            <p><strong>เทียบช่วงก่อน</strong> เปรียบเทียบยอดขายกับช่วงก่อนหน้าที่มีจำนวนวันเท่ากัน</p>
            <p><strong>เมนูขายดี</strong> เรียงตามจำนวนชิ้นที่ขายได้ ส่วนช่องทางชำระเงินแสดงยอดและจำนวนบิล</p>
            <p><strong>ตลอดช่วงข้อมูล</strong> รวมตั้งแต่วันที่มีรายการแรกในระบบ</p>
          </div>
        </details>
      </div>

      <section className="owner-period-section" aria-labelledby="owner-period-heading">
        <div className="owner-section-intro">
          <div>
            <h2 id="owner-period-heading">ผลประกอบการ · {periodLabel}</h2>
            <p>ตัวเลขยอดขายและจำนวนบิลตามขอบเขตรายงานด้านบน</p>
          </div>
        </div>
        <div className="owner-stats-grid owner-report-stats-grid">
        <div className="owner-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">ยอดขาย · {periodLabel}</span>
            <div className="stat-icon-wrapper owner-report-stat-icon">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="stat-card-value"><span className="stat-currency">฿</span><span>{periodSales.sales.toLocaleString()}</span></div>
          <div className="stat-card-sub owner-period-stat-sub">
            <span>{periodSales.orders} บิลที่ไม่ถูกยกเลิก</span>
            {reportPeriod !== "all" && <span className={`owner-trend ${salesChange !== null && salesChange < 0 ? "down" : ""}`}>{salesChange === null ? "ยังไม่มีข้อมูลช่วงก่อนหน้า" : `${salesChange > 0 ? "+" : ""}${salesChange}% จากช่วงก่อน`}</span>}
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">ยอดเฉลี่ยต่อบิล · {periodLabel}</span>
            <div className="stat-icon-wrapper owner-report-stat-icon">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="stat-card-value"><span className="stat-currency">฿</span><span>{(periodSales.orders ? Math.round(periodSales.sales / periodSales.orders) : 0).toLocaleString()}</span></div>
          <div className="stat-card-sub owner-period-stat-sub">
            <span>จาก {periodSales.orders} บิลในช่วงที่เลือก</span>
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">ออเดอร์เสร็จสิ้น · {periodLabel}</span>
            <div className="stat-icon-wrapper owner-report-stat-icon">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="stat-card-value">{completedInPeriod} <span className="stat-unit">บิล</span></div>
          <div className="stat-card-sub">
            <span>ออเดอร์สถานะเสร็จสิ้นในช่วงที่เลือก</span>
          </div>
        </div>
      </div>
      </section>

      <section className="owner-live-queue" aria-labelledby="owner-live-queue-heading">
        <div className="owner-live-queue-header">
          <div className="owner-live-queue-title">
            <div className="owner-queue-icon"><Clock size={19} aria-hidden="true" /></div>
            <div>
              <h2 id="owner-live-queue-heading">สถานะคิวปัจจุบัน</h2>
              <p>ข้อมูลสดของ{currentBranchLabel}</p>
            </div>
            <span className={`owner-live-label ${liveQueueError ? "is-stale" : ""}`}>
              <span className="live-dot" aria-hidden="true"></span>
              {liveQueueError ? "อัปเดตไม่สำเร็จ" : liveQueueStats?.branch === dashboardBranch ? "สด" : "กำลังเชื่อมต่อ"}
            </span>
          </div>
          {(queueStats.pending > 0 || waitingOrdersOpen) && (
            <button
              type="button"
              className="owner-queue-action"
              onClick={() => showWaitingOrders()}
              aria-expanded={waitingOrdersOpen}
              aria-controls={waitingOrdersOpen ? "owner-waiting-orders" : undefined}
            >
              {waitingOrdersOpen ? "ซ่อนรายการคิว" : `ดู ${queueStats.pending} คิวที่รอทำ`}
              <ChevronDown size={15} className={`owner-queue-action-icon ${waitingOrdersOpen ? "is-open" : ""}`} aria-hidden="true" />
            </button>
          )}
        </div>
        {/* วางเวลาอัปเดตติดกับตัวเลขคิว เพื่อให้เห็นชัดเมื่อข้อมูลยังไม่สด */}
        <p className={`owner-queue-freshness ${liveQueueError ? "is-stale" : ""}`} role="status" aria-live="polite">
          {liveQueueError
            ? liveQueueUpdatedAt
              ? `อัปเดตไม่สำเร็จ · แสดงข้อมูลคิวล่าสุด ${liveQueueUpdatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "ยังโหลดคิวสดไม่ได้ · ระบบจะลองอีกครั้งอัตโนมัติ"
            : liveQueueUpdatedAt
              ? `คิวอัปเดตล่าสุด ${liveQueueUpdatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "กำลังโหลดสถานะคิว"}
        </p>
        <div className="owner-queue-metrics" aria-label="จำนวนคิวตามสถานะ">
          <div><span>คิวที่ยังไม่เสร็จ</span><strong>{queueStats.active} <small>คิว</small></strong></div>
          <div><span>รอทำ</span><strong>{queueStats.pending}</strong></div>
          <div><span>กำลังชง</span><strong>{queueStats.cooking}</strong></div>
          <div><span>พร้อมเสิร์ฟ</span><strong>{queueStats.ready}</strong></div>
        </div>
        {waitingOrdersOpen && (
          <div className="owner-waiting-orders" id="owner-waiting-orders">
              <div className="owner-waiting-orders-heading">
              <h3>ออเดอร์ที่รอเริ่มทำ</h3>
              {waitingOrdersState?.branch === dashboardBranch && !waitingOrdersLoading && !waitingOrdersError && (
                  <span>{waitingOrdersState.orders.length} คิว · โหลดเมื่อ {waitingOrdersState.updatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              )}
                {!waitingOrdersLoading && !waitingOrdersError && <button type="button" onClick={() => showWaitingOrders(true)}>โหลดใหม่</button>}
            </div>
            {waitingOrdersLoading ? (
              <p className="owner-queue-list-message" role="status">กำลังโหลดคิวปัจจุบัน…</p>
            ) : waitingOrdersError ? (
              <div className="owner-queue-list-error" role="alert">
                <span>โหลดรายการคิวไม่สำเร็จ</span>
                <button type="button" onClick={() => showWaitingOrders(true)}>ลองอีกครั้ง</button>
              </div>
            ) : waitingOrdersState?.branch === dashboardBranch && waitingOrdersState.orders.length > 0 ? (
              <ul className="owner-waiting-order-list">
                {waitingOrdersState.orders.map((order) => (
                  <li key={order.id}>
                    <span className="queue-pill">คิว A-{order.queue_no}</span>
                    <div className="owner-waiting-order-copy">
                      <strong>{order.order_no}</strong>
                      <span>{(order.items || []).map((item) => `${item.product_name} ×${item.quantity}`).join(" · ")}</span>
                    </div>
                    <span className="owner-waiting-order-time">
                      {new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="owner-queue-list-message">ตอนนี้ไม่มีออเดอร์ที่รอเริ่มทำ</p>
            )}
          </div>
        )}
      </section>

      {/* Middle Grid: Top Products & Payment Methods */}
      <div className="owner-middle-grid">
        {/* Top 5 Products */}
        <div className="owner-section-box">
          <div className="section-box-header">
            <div className="box-title-group">
              <Flame size={20} className="text-amber-500" />
              <h2>5 เมนูขายดีที่สุด</h2>
            </div>
            <span className="section-tag">{periodLabel} · เรียงตามจำนวนที่ขาย</span>
          </div>

          <div className="top-products-list">
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((prod, idx) => {
                const percent = Math.round((prod.total_qty / maxTopQty) * 100);
                return (
                  <div key={prod.id} className="top-product-item">
                    <div className="top-product-rank">#{idx + 1}</div>
                    <div className="top-product-info">
                      <div className="top-product-name-row">
                        <span className="top-product-name">{prod.name}</span>
                        <span className="top-product-stats">
                          <strong>{prod.total_qty}</strong> ชิ้น · ฿{prod.total_revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-bar"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-box">ยังไม่มีข้อมูลยอดขายเมนู</div>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="owner-section-box">
          <div className="section-box-header">
            <div className="box-title-group">
              <CreditCard size={20} className="text-emerald-500" />
              <h2>ช่องทางชำระเงิน</h2>
            </div>
            <span className="section-tag">{periodLabel}</span>
          </div>

          <div className="payment-breakdown-list">
            {paymentBreakdown && paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((pm) => {
                const details = getPaymentDetails(pm.payment_method);
                const percent = periodSales.sales > 0 ? Math.round((pm.total / periodSales.sales) * 100) : 0;
                return (
                  <div key={pm.payment_method} className={`payment-card ${details.class}`}>
                    <div className="payment-card-left">
                      <div className="payment-icon-pill">{details.icon}</div>
                      <div>
                        <div className="payment-name">{details.label}</div>
                        <div className="payment-count">{pm.count} รายการ ({percent}%)</div>
                      </div>
                    </div>
                    <div className="payment-total">฿{pm.total.toLocaleString()}</div>
                  </div>
                );
              })
            ) : (
              <div className="empty-box">ยังไม่มีข้อมูลการชำระเงิน</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Orders Table */}
      <div className="owner-section-box orders-table-box" id="owner-orders">
        <div className="table-box-header">
          <div className="box-title-group">
            <ShoppingBag size={20} className="text-blue-500" />
            <h2>รายการสั่งซื้อล่าสุด · {currentBranchLabel} · {periodLabel}</h2>
            <span className="order-count-chip">{filteredOrders.length} รายการ</span>
            <span className="ledger-cap-note">แสดงสูงสุด 50 รายการล่าสุด</span>
          </div>

          <div className="table-controls">
            {/* Search Box */}
            <div className="table-search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="ค้นหาเลขออเดอร์ / คิว..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter Tabs */}
            <OwnerDropdown
              label="สถานะ"
              value={statusFilter}
              onChange={setStatusFilter}
              className="ledger-status-control"
              icon={ListFilter}
              options={[
                { value: "all", label: "ทุกสถานะ" },
                { value: "pending", label: "รอทำ" },
                { value: "cooking", label: "กำลังชง" },
                { value: "ready", label: "พร้อมเสิร์ฟ" },
                { value: "completed", label: "เสร็จสิ้น" },
                { value: "cancelled", label: "ยกเลิก" },
              ]}
            />
            {(searchTerm || statusFilter !== "all") && <button type="button" className="ledger-clear-btn" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}><X size={14} /> ล้างตัวกรอง</button>}
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="owner-orders-table">
            <thead>
              <tr>
                <th>เลขคิว / บิล</th>
                <th>เวลา / รายการสินค้า</th>
                <th>ชำระเงิน / ยอดเงิน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const pay = getPaymentDetails(ord.payment_method);
                  const dateStr = new Date(ord.created_at).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={ord.id}>
                      <td>
                        <div className="order-id-cell">
                          <span className="queue-pill">คิว A-{ord.queue_no}</span>
                          <span className="order-no-sub">{ord.order_no}</span>
                        </div>
                      </td>
                      <td>
                        <div className="time-cell">{dateStr} น.</div>
                        <div className="order-items-compact">
                          {(ord.items || []).map((it, i) => {
                            let optText = "";
                            try {
                              const opts = typeof it.options_json === "string" ? JSON.parse(it.options_json) : it.options_json;
                              const parts = [];
                              const temperature = opts?.temperatureName || opts?.temperature;
                              const size = opts?.sizeName || opts?.size;
                              const sweetness = opts?.sweetnessName || opts?.sweetness;
                              const toppings = opts?.toppingNames?.length ? opts.toppingNames : opts?.toppings;
                              const bakeryOption = opts?.bakeryOptionName;
                              if (temperature) parts.push(temperature);
                              if (size) parts.push(`ไซส์ ${size}`);
                              if (sweetness) {
                                const percent = sweetness.match?.(/\d+\s*%/)?.[0];
                                parts.push(percent ? `หวาน ${percent}` : sweetness);
                              }
                              if (toppings?.length) parts.push(`ท็อปปิง: ${toppings.join(", ")}`);
                              if (bakeryOption) parts.push(`หมายเหตุ: ${bakeryOption}`);
                              if (opts?.note) parts.push(`หมายเหตุ: ${opts.note}`);
                              optText = parts.join(" · ");
                            } catch {
                              optText = "";
                            }
                            return (
                              <div key={i} className="item-line">
                                <span className="item-name">{it.product_name} x{it.quantity}</span>
                                {optText && <span className="item-opt">({optText})</span>}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td><div className="ledger-payment-cell"><div className="pay-method-badge">{pay.icon}<span>{pay.label}</span></div><span className="amount-cell">฿{ord.total_amount.toLocaleString()}</span></div></td>
                      <td>{getStatusBadge(ord.status)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">
                    ไม่พบรายการออเดอร์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
);
}
