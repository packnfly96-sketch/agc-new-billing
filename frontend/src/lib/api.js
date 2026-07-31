import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

// ---------- Company ----------
export const companyApi = {
  get: () => api.get("/company").then((r) => r.data),
  update: (data) => api.put("/company", data).then((r) => r.data),
  uploadAsset: (assetType, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post(`/company/assets/${assetType}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  removeAsset: (assetType) =>
    api.delete(`/company/assets/${assetType}`).then((r) => r.data),
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
  nextNumber: () => api.get("/invoices/next-number").then((r) => r.data),
  pdfUrl: (id) => `${API_BASE}/invoices/${id}/pdf`,
};

// ---------- Reports ----------
export const reportsApi = {
  summary: (params) => api.get("/reports/summary", { params }).then((r) => r.data),
};
