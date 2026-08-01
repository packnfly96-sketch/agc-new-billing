import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const TOKEN_KEY = "sde_access_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: API_BASE });

// Attach Bearer token
api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Redirect to /login on 401
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);

// ---------- Auth ----------
export const authApi = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  changePassword: (current_password, new_password) =>
    api.post("/auth/change-password", { current_password, new_password }).then((r) => r.data),
  forgotPassword: (email) =>
    api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, new_password) =>
    api.post("/auth/reset-password", { token, new_password }).then((r) => r.data),
};

// ---------- Company ----------
export const companyApi = {
  get: () => api.get("/company").then((r) => r.data),
  update: (data) => api.put("/company", data).then((r) => r.data),
  uploadAsset: (assetType, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post(`/company/assets/${assetType}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
  removeAsset: (assetType) => api.delete(`/company/assets/${assetType}`).then((r) => r.data),
};

export const assetUrl = (company, assetType) => {
  if (!company?.[assetType]) return null;
  const v = encodeURIComponent(company.updated_at || Date.now());
  return `${API_BASE}/company/assets/${assetType}/file?v=${v}`;
};

// ---------- Customers ----------
export const customersApi = {
  list: () => api.get("/customers").then((r) => r.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post("/customers", data).then((r) => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
};

// ---------- Partners ----------
export const partnersApi = {
  list: () => api.get("/partners").then((r) => r.data),
  get: (id) => api.get(`/partners/${id}`).then((r) => r.data),
  create: (data) => api.post("/partners", data).then((r) => r.data),
  update: (id, data) => api.put(`/partners/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/partners/${id}`).then((r) => r.data),
};

// ---------- Invoices ----------
export const invoicesApi = {
  list: () => api.get("/invoices").then((r) => r.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data),
  create: (data) => api.post("/invoices", data).then((r) => r.data),
  update: (id, data) => api.put(`/invoices/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/invoices/${id}`).then((r) => r.data),
  duplicate: (id) => api.post(`/invoices/${id}/duplicate`).then((r) => r.data),
  nextNumber: () => api.get("/invoices/next-number").then((r) => r.data),
  pdfUrl: (id) => `${API_BASE}/invoices/${id}/pdf`,
};

// ---------- Reports ----------
export const reportsApi = {
  summary: (params) => api.get("/reports/summary", { params }).then((r) => r.data),
  monthlyExcelUrl: (year, month) => {
    const t = tokenStore.get();
    return `${API_BASE}/reports/monthly-excel?year=${year}&month=${month}${t ? `&auth=${encodeURIComponent(t)}` : ""}`;
  },
  downloadMonthlyExcel: async (year, month) => {
    const res = await api.get(`/reports/monthly-excel?year=${year}&month=${month}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SDE_Monthly_${year}-${String(month).padStart(2, "0")}.xlsx`;
    a.click();
  },
};
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};
