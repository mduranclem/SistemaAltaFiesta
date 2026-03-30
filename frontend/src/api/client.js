import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Productos
export const productsApi = {
  list: (params) => api.get('/products/', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  updatePrice: (id, data) => api.patch(`/products/${id}/price`, data),
  adjustStock: (id, quantity, reason) =>
    api.post(`/products/${id}/stock`, { quantity, reason }),
  lowStock: () => api.get('/products/low-stock'),
  bulkMargin: (margin, category) =>
    api.post('/products/prices/bulk-margin', null, {
      params: { new_margin: margin, category },
    }),
}

// Ventas
export const salesApi = {
  create: (data) => api.post('/sales/', data),
  get: (id) => api.get(`/sales/${id}`),
  listByDate: (date) => api.get('/sales/', { params: { date } }),
}

// Finanzas
export const financesApi = {
  createExpense: (data) => api.post('/finances/expenses', data),
  listExpenses: (date) => api.get('/finances/expenses', { params: { date } }),
  summary: (date) => api.get('/finances/summary', { params: { date } }),
  closeCash: (date, notes) =>
    api.post('/finances/close', null, { params: { date, notes } }),
  listCloses: () => api.get('/finances/closes'),
}

export default api
