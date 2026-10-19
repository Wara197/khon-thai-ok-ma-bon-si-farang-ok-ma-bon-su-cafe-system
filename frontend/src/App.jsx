import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CashierView from './components/cashier/CashierView';
import BaristaView from './components/barista/BaristaView';
import OwnerView from './components/owner/OwnerView';
import LoginScreen from './components/LoginScreen';
import { fetchQueue, fetchBranches, fetchCurrentUser, login, logout } from './services/api';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cashier'); // 'cashier' | 'barista' | 'owner'
  const [queueCount, setQueueCount] = useState(0);
  const [branches, setBranches] = useState([
    { id: 1, name: "สาขา 1: หน้า ม.บูรพา (Main Campus)", address: "ถนนลงหาดบางแสน ชลบุรี" },
    { id: 2, name: "สาขา 2: ห้างแหลมทอง (Mall Branch)", address: "ชั้น 1 ศูนย์การค้าแหลมทอง บางแสน" },
    { id: 3, name: "สาขา 3: ชายหาดวอนนภา (Beachfront)", address: "ถนนเลียบหาดวอนนภา ชลบุรี" },
  ]);
  const [selectedBranch, setSelectedBranch] = useState(1);

  useEffect(() => {
    let mounted = true;
    // กู้สถานะผู้ใช้จาก session cookie เมื่อเปิดหรือ refresh หน้าเว็บ
    fetchCurrentUser().then((currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) setActiveTab(currentUser.role === 'owner' ? 'owner' : currentUser.role);
    }).catch(() => { if (mounted) setUser(null); }).finally(() => { if (mounted) setAuthLoading(false); });
    // เมื่อ API ตอบว่า session หมดอายุ ให้ล้างสถานะผู้ใช้และคิวที่แสดงใน navbar
    const expire = () => { setUser(null); setQueueCount(0); };
    window.addEventListener('coffee-pos-auth-expired', expire);
    return () => { mounted = false; window.removeEventListener('coffee-pos-auth-expired', expire); };
  }, []);

  const handleLogin = async (username, password) => {
    const loggedInUser = await login(username, password);
    setUser(loggedInUser);
    setActiveTab(loggedInUser.role === 'owner' ? 'owner' : loggedInUser.role);
  };

  const handleLogout = async () => {
    try { await logout(); } finally { setUser(null); setQueueCount(0); }
  };

  // Load branches from backend
  useEffect(() => {
    if (!user) return undefined;
    async function loadBranches() {
      try {
        const data = await fetchBranches();
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
        }
      } catch (err) {
        console.warn('Using default branches:', err);
      }
    }
    loadBranches();
  }, [user]);

  // Keep queue badge updated in navbar for selected branch
  const refreshQueueCount = async () => {
    if (!user || user.role === 'cashier') { setQueueCount(0); return; }
    try {
      const data = await fetchQueue(selectedBranch);
      const list = Array.isArray(data) ? data : data.value || [];
      setQueueCount(list.length);
    } catch (err) {
      // Silently catch background badge error
    }
  };

  useEffect(() => {
    if (!user || user.role === 'cashier') return undefined;
    refreshQueueCount();
    const interval = setInterval(refreshQueueCount, 5000);
    return () => clearInterval(interval);
  }, [selectedBranch, user]);

  if (authLoading) return <div className="auth-loading">กำลังตรวจสอบสิทธิ์…</div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app-container">
      {/* Global Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={queueCount}
        branches={branches}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Views */}
      {activeTab === 'cashier' && (
        <CashierView
          selectedBranch={selectedBranch}
          branches={branches}
          onOrderPlaced={refreshQueueCount}
          onSwitchToBarista={user.role === 'owner' ? () => setActiveTab('barista') : undefined}
        />
      )}
      {activeTab === 'barista' && (
        <BaristaView
          selectedBranch={selectedBranch}
          branches={branches}
        />
      )}
      {activeTab === 'owner' && (
        <OwnerView
          selectedBranch={selectedBranch}
          branches={branches}
          currentUser={user}
        />
      )}
    </div>
  );
}
