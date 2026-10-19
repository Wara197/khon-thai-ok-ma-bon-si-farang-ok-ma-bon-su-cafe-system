/**
 * Client API Service for Coffee Shop POS
 * Interacts with Backend REST endpoints
 */

const API_BASE = "/api";

async function apiFetch(url, options = {}) {
  // ส่ง cookie session ไปกับ API ทุกครั้ง และแจ้ง App เมื่อ session หมดอายุเพื่อกลับหน้า login
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (response.status === 401 && !url.endsWith("/auth/login")) {
    window.dispatchEvent(new CustomEvent("coffee-pos-auth-expired"));
  }
  return response;
}

export async function fetchCurrentUser() {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

export async function login(username, password) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
  return data.user;
}

export async function logout() {
  await apiFetch(`${API_BASE}/auth/logout`, { method: "POST" });
}

export async function fetchUsers() {
  const res = await apiFetch(`${API_BASE}/users`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถโหลดบัญชีผู้ใช้ได้");
  return data.users || [];
}

export async function createUser(payload) {
  const res = await apiFetch(`${API_BASE}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถสร้างบัญชีผู้ใช้ได้");
  return data.user;
}

export async function setUserActive(id, isActive) {
  const res = await apiFetch(`${API_BASE}/users/${id}/active`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถแก้ไขสถานะบัญชีได้");
  return data;
}

export async function resetUserPassword(id, password) {
  const res = await apiFetch(`${API_BASE}/users/${id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
  return data;
}

export async function fetchProducts() {
  const res = await apiFetch(`${API_BASE}/products`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch products: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCategories() {
  const res = await apiFetch(`${API_BASE}/categories`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch categories: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBranches() {
  const res = await apiFetch(`${API_BASE}/branches`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch branches: ${res.statusText}`);
  }
  return res.json();
}

export async function createOrder(orderData) {
  const res = await apiFetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถสร้างออเดอร์ได้");
  }
  return data;
}

export async function fetchQueue(branchId = null, signal) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const res = await apiFetch(`${API_BASE}/orders/queue${query}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch queue: ${res.statusText}`);
  }
  return res.json();
}

// Owner Dashboard ใช้ endpoint สรุปแทนการโหลดออเดอร์เต็มชุดในการ refresh คิวสด
export async function fetchQueueStats(branchId = null, signal) {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  const query = params.size ? `?${params.toString()}` : "";
  const res = await apiFetch(`${API_BASE}/orders/queue/stats${query}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch queue stats: ${res.statusText}`);
  }
  return res.json();
}

export async function updateOrderStatus(orderId, newStatus) {
  const res = await apiFetch(`${API_BASE}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถเปลี่ยนสถานะออเดอร์ได้");
  }
  return data;
}

export async function cancelOrder(orderId) {
  const res = await apiFetch(`${API_BASE}/orders/${orderId}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถยกเลิกออเดอร์ได้");
  }
  return data;
}

export async function fetchSalesReport(branchId = null, period = "today", signal) {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  params.set("period", period);
  const res = await apiFetch(`${API_BASE}/reports/sales?${params.toString()}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch sales report: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchInventory() {
  const res = await apiFetch(`${API_BASE}/inventory`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถโหลดคลังวัตถุดิบได้");
  return data;
}

export async function updateInventory(id, payload) {
  const res = await apiFetch(`${API_BASE}/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถอัปเดตคลังวัตถุดิบได้");
  return data;
}

export async function createInventory(payload) {
  const res = await apiFetch(`${API_BASE}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถเพิ่มวัตถุดิบได้");
  return data;
}

export async function receiveInventory(id, payload) {
  const res = await apiFetch(`${API_BASE}/inventory/${id}/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถบันทึกรับวัตถุดิบได้");
  return data;
}

export async function saveRecipe(payload) {
  const res = await apiFetch(`${API_BASE}/recipes`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถบันทึกสูตรได้");
  return data;
}

export async function deleteRecipe(productId, inventoryId, optionType = "base", optionId = 0) {
  const res = await apiFetch(`${API_BASE}/recipes/${productId}/${inventoryId}/${optionType}/${optionId}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ไม่สามารถลบสูตรได้");
  return data;
}

export async function createProduct(productData) {
  const res = await apiFetch(`${API_BASE}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถเพิ่มเมนูได้");
  }
  return data;
}

export async function updateProduct(id, productData) {
  const res = await apiFetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถแก้ไขเมนูได้");
  }
  return data;
}

export async function deleteProduct(id) {
  const res = await apiFetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถลบเมนูได้");
  }
  return data;
}

export async function uploadImage(base64Data) {
  const res = await apiFetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: base64Data }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ไม่สามารถอัปโหลดรูปภาพได้");
  }
  return data;
}
