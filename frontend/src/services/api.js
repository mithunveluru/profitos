const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

class ApiClient {
  constructor() { this.baseURL = BASE_URL; }

  _getToken() { return localStorage.getItem("access_token"); }

  async _request(method, path, body = null, params = null) {
    const url = new URL(`${this.baseURL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) url.searchParams.set(k, v);
      });
    }
    const headers = { "Content-Type": "application/json" };
    const token = this._getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url.toString(), {
      method, headers, body: body ? JSON.stringify(body) : null,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Request failed");
    return json.data;
  }

  get(path, params) { return this._request("GET", path, null, params); }
  post(path, body) { return this._request("POST", path, body); }
  put(path, body) { return this._request("PUT", path, body); }
  patch(path, body) { return this._request("PATCH", path, body); }
  delete(path) { return this._request("DELETE", path); }
}

export const api = new ApiClient();

export const authApi = {
  login: (creds) => api.post("/auth/login", creds),
  register: (data) => api.post("/auth/register", data),
};

export const inventoryApi = {
  getProducts: (params) => api.get("/inventory/products", params),
  createProduct: (data) => api.post("/inventory/products", data),
  updateProduct: (id, data) => api.put(`/inventory/products/${id}`, data),
  recordTransaction: (data) => api.post("/inventory/transactions", data),
  listTransactions: (params) => api.get("/inventory/transactions", params),
  getLowStockAlerts: () => api.get("/inventory/alerts/low-stock"),
};

export const procurementApi = {
  getReorderSuggestions: () => api.get("/procurement/reorder-suggestions"),
  createPO: (data) => api.post("/procurement/purchase-orders", data),
  listPOs: (params) => api.get("/procurement/purchase-orders", params),
  getPO: (id) => api.get(`/procurement/purchase-orders/${id}`),
  updatePOStatus: (id, data) => api.patch(`/procurement/purchase-orders/${id}/status`, data),
};

export const invoiceApi = {
  list: (params) => api.get("/invoices", params),
  getInbox: () => api.get("/invoices/inbox"),
  get: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post("/invoices", data),
  approve: (id) => api.post(`/invoices/${id}/approve`, {}),
  reject: (id, reason) => api.post(`/invoices/${id}/reject`, { reason }),
  upload: async (formData) => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"}/invoices/upload`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
    );
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Upload failed");
    return json.data;
  },
};

export const salesApi = {
  listInvoices:   (params) => api.get("/sales/invoices", params),
  getInvoice:     (id)     => api.get(`/sales/invoices/${id}`),
  createInvoice:  (data)   => api.post("/sales/invoices", data),
  recordPayment:  (id, data) => api.post(`/sales/invoices/${id}/payments`, data),
  getARDashboard: ()       => api.get("/sales/ar-dashboard"),
  listCustomers:  ()       => api.get("/sales/customers"),
  createCustomer: (data)   => api.post("/sales/customers", data),
};

export const dashboardApi = {
  getSummary:  () => api.get("/dashboard/summary"),
  getCashflow: () => api.get("/dashboard/cashflow"),
  getKpis:     () => api.get("/dashboard/kpis"),
};
export const suppliersApi = {
  list:             (params) => api.get("/suppliers", params),
  get:              (id)     => api.get(`/suppliers/${id}`),
  create:           (data)   => api.post("/suppliers", data),
  update:           (id, data) => api.patch(`/suppliers/${id}`, data),
  deactivate:       (id)     => api.delete(`/suppliers/${id}`),
  recalculateScore: (id)     => api.post(`/suppliers/${id}/recalculate-score`, {}),
};

export const auditApi = {
  list: (params) => api.get("/audit", params),
};

export const usersApi = {
  getMe:   ()          => api.get("/users/me"),
  list:    ()          => api.get("/users"),
  update:  (id, data)  => api.patch(`/users/${id}`, data),
};