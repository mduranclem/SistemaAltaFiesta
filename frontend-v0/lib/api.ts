const BASE_URL = process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000')
const API = `${BASE_URL}/api/v1`

// ── Auth helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_username')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.reload()
  }
  return res
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  sku: string
  category: string
  unit_type: string
  stock: number
  min_stock: number
  cost_price: number
  margin_percent: number
  sale_price: number
  package_size: number
  retail_price: number | null
  is_active: boolean
  is_combo: boolean
  is_low_stock: boolean
  combo_available: boolean
  combo_missing?: string | null
}

export interface SaleItem {
  product_id: number
  quantity: number
  is_retail?: boolean
  unit_price_override?: number
}

export interface Sale {
  id: number
  payment_method: string
  total: number
  notes?: string
  created_at: string
  items: { product_id: number; quantity: number; unit_price: number }[]
}

export interface Expense {
  id: number
  description: string
  category: string
  amount: number
  created_at: string
}

export interface DailySummary {
  date: string
  sales_count: number
  total_cash: number
  total_debit: number
  total_credit: number
  total_transfer: number
  gross_income: number
  total_expenses: number
  net_balance: number
}

export interface CloseRecord {
  id: number
  close_date: string
  opening_cash: number
  gross_income: number
  total_cash: number
  total_debit: number
  total_credit: number
  total_transfer: number
  total_expenses: number
  net_balance: number
  expected_cash: number
  notes?: string
  created_at: string
}

export interface ComboItem {
  id: number
  combo_product_id: number
  ingredient_product_id: number
  quantity: number
  ingredient_name: string
}

export async function getComboItems(productId: number): Promise<ComboItem[]> {
  const res = await apiFetch(`${API}/products/${productId}/combo-items`)
  if (!res.ok) throw new Error('Error al cargar combo')
  return res.json()
}

export async function addComboItem(productId: number, data: { ingredient_product_id: number; quantity: number }): Promise<ComboItem> {
  const res = await apiFetch(`${API}/products/${productId}/combo-items`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al agregar ingrediente')
  return res.json()
}

export async function deleteComboItem(productId: number, itemId: number): Promise<void> {
  const res = await apiFetch(`${API}/products/${productId}/combo-items/${itemId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar ingrediente')
}

export interface ChartPoint {
  date: string
  ventas: number
  gastos: number
  balance: number
}

export interface AppSettings {
  business_name: string
  business_subtitle: string
  currency: string
  debit_surcharge_percent: number
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<{ token: string; username: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Usuario o contraseña incorrectos')
  return res.json()
}

export async function logout(): Promise<void> {
  await apiFetch(`${API}/auth/logout`, { method: 'POST' })
  clearToken()
}

export async function changePassword(newPassword: string): Promise<void> {
  const res = await apiFetch(`${API}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
  if (!res.ok) throw new Error('Error al cambiar contraseña')
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts(params?: { active_only?: boolean; category?: string }): Promise<Product[]> {
  const qs = new URLSearchParams()
  if (params?.active_only !== undefined) qs.set('active_only', String(params.active_only))
  if (params?.category) qs.set('category', params.category)
  const res = await apiFetch(`${API}/products/${qs.toString() ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error('Error al cargar productos')
  return res.json()
}

export async function createProduct(data: Omit<Product, 'id' | 'sale_price' | 'is_low_stock'> & { sale_price_override?: number }): Promise<Product> {
  const res = await apiFetch(`${API}/products/`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al crear producto')
  return res.json()
}

export async function updateProduct(id: number, data: Partial<Product> & { sale_price_override?: number }): Promise<Product> {
  const res = await apiFetch(`${API}/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al actualizar producto')
  return res.json()
}

export async function updateProductPrice(id: number, data: { cost_price?: number; margin_percent?: number }): Promise<Product> {
  const res = await apiFetch(`${API}/products/${id}/price`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al actualizar precio')
  return res.json()
}

export async function adjustStock(id: number, quantity: number): Promise<Product> {
  const res = await apiFetch(`${API}/products/${id}/stock`, { method: 'POST', body: JSON.stringify({ quantity }) })
  if (!res.ok) throw new Error('Error al ajustar stock')
  return res.json()
}

export async function getLowStockProducts(): Promise<Product[]> {
  const res = await apiFetch(`${API}/products/low-stock`)
  if (!res.ok) throw new Error('Error al cargar productos críticos')
  return res.json()
}

export async function bulkUpdateMargin(margin_percent: number): Promise<void> {
  const res = await apiFetch(`${API}/products/prices/bulk-margin`, {
    method: 'POST',
    body: JSON.stringify({ margin_percent }),
  })
  if (!res.ok) throw new Error('Error al actualizar márgenes')
}

export async function deactivateProduct(id: number): Promise<void> {
  const res = await apiFetch(`${API}/products/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar producto')
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function createSale(data: { payment_method: string; items: SaleItem[]; discount?: number; surcharge?: number; notes?: string }): Promise<Sale> {
  const res = await apiFetch(`${API}/sales/`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al registrar venta')
  return res.json()
}

export async function getSales(date?: string): Promise<Sale[]> {
  const qs = date ? `?date=${date}` : ''
  const res = await apiFetch(`${API}/sales/${qs}`)
  if (!res.ok) throw new Error('Error al cargar ventas')
  return res.json()
}

export interface ProfitReport {
  from: string
  to: string
  total_revenue: number
  total_cogs: number
  gross_profit: number
  profit_margin: number
  by_day: { date: string; revenue: number; cogs: number; profit: number }[]
}

export async function getProfitReport(dateFrom: string, dateTo: string): Promise<ProfitReport> {
  const res = await apiFetch(`${API}/sales/profit?date_from=${dateFrom}&date_to=${dateTo}`)
  if (!res.ok) throw new Error('Error al cargar reporte de ganancias')
  return res.json()
}

export interface TopProduct {
  product_id: number
  name: string
  category: string
  unit_type: string
  total_qty: number
  total_revenue: number
  profit: number
  margin_percent: number
}

export async function getTopProducts(days: number = 30, limit: number = 8): Promise<TopProduct[]> {
  const res = await apiFetch(`${API}/sales/top-products?days=${days}&limit=${limit}`)
  if (!res.ok) throw new Error('Error al cargar top productos')
  return res.json()
}

export async function deleteSale(id: number): Promise<void> {
  const res = await apiFetch(`${API}/sales/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar venta')
}

// ── Finances ──────────────────────────────────────────────────────────────────

export async function createExpense(data: { description: string; category: string; amount: number }): Promise<Expense> {
  const res = await apiFetch(`${API}/finances/expenses`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al registrar gasto')
  return res.json()
}

export async function updateExpense(id: number, data: { description?: string; category?: string; amount?: number }): Promise<Expense> {
  const res = await apiFetch(`${API}/finances/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al editar gasto')
  return res.json()
}

export async function getExpenses(date?: string): Promise<Expense[]> {
  const qs = date ? `?date=${date}` : ''
  const res = await apiFetch(`${API}/finances/expenses${qs}`)
  if (!res.ok) throw new Error('Error al cargar gastos')
  return res.json()
}

export async function deleteExpense(id: number): Promise<void> {
  const res = await apiFetch(`${API}/finances/expenses/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar gasto')
}

export async function getDailySummary(date?: string): Promise<DailySummary> {
  const qs = date ? `?date=${date}` : ''
  const res = await apiFetch(`${API}/finances/summary${qs}`)
  if (!res.ok) throw new Error('Error al cargar resumen')
  return res.json()
}

export async function closeTurn(date?: string, openingCash: number = 0): Promise<CloseRecord> {
  const qs = date ? `?date=${date}` : ''
  const res = await apiFetch(`${API}/finances/close${qs}`, {
    method: 'POST',
    body: JSON.stringify({ opening_cash: openingCash }),
  })
  if (!res.ok) throw new Error('Error al cerrar turno')
  return res.json()
}

export async function deleteClose(id: number): Promise<void> {
  const res = await apiFetch(`${API}/finances/closes/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error('Error al cancelar el cierre')
}

export async function getCloseHistory(): Promise<CloseRecord[]> {
  const res = await apiFetch(`${API}/finances/closes`)
  if (!res.ok) throw new Error('Error al cargar historial')
  return res.json()
}

export async function getChartData(days: number = 7): Promise<ChartPoint[]> {
  const res = await apiFetch(`${API}/finances/chart?days=${days}`)
  if (!res.ok) throw new Error('Error al cargar datos del gráfico')
  return res.json()
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const res = await apiFetch(`${API}/settings/`)
  if (!res.ok) throw new Error('Error al cargar configuración')
  return res.json()
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await apiFetch(`${API}/settings/`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Error al guardar configuración')
  return res.json()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
