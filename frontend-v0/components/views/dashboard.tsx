'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  Wallet,
  Banknote,
  AlertTriangle,
  CreditCard,
  Smartphone,
  ShoppingBag,
  RefreshCw,
  X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import {
  getDailySummary, getLowStockProducts, getChartData, getTopProducts,
  type DailySummary, type Product, type ChartPoint, type TopProduct,
  formatCurrency, todayISO,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  efectivo: { label: 'Efectivo', icon: Banknote, color: 'text-success' },
  debito: { label: 'Débito', icon: CreditCard, color: 'text-primary' },
  credito: { label: 'Crédito', icon: CreditCard, color: 'text-warning' },
  transferencia: { label: 'Transferencia', icon: Smartphone, color: 'text-chart-5' },
}

export function DashboardView({ onNavigateToLowStock }: { onNavigateToLowStock?: () => void } = {}) {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStockAlert, setShowStockAlert] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [s, ls, ch, tp] = await Promise.all([
        getDailySummary(todayISO()),
        getLowStockProducts(),
        getChartData(7),
        getTopProducts(30, 20),
      ])
      setSummary(s)
      setLowStock(ls)
      setChart(ch)
      setTopProducts(tp)
    } catch {
      setError('No se pudo conectar con el servidor. Verifique que el backend esté activo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
          Reintentar
        </button>
      </div>
    )
  }

  const stat = summary!

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Principal</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-card transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Alerta de stock crítico */}
      {lowStock.length > 0 && showStockAlert && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive flex-1">
            {lowStock.length} {lowStock.length === 1 ? 'producto' : 'productos'} con stock crítico:{' '}
            <span className="font-normal">{lowStock.slice(0, 3).map((p) => p.name).join(', ')}{lowStock.length > 3 ? '...' : ''}</span>
          </p>
          <button onClick={() => setShowStockAlert(false)} className="text-destructive hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas del Día"
          value={formatCurrency(stat.gross_income)}
          sub={`${stat.sales_count} transacciones`}
          icon={TrendingUp}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Balance Neto"
          value={formatCurrency(stat.net_balance)}
          sub={`Gastos: ${formatCurrency(stat.total_expenses)}`}
          icon={Wallet}
          colorClass={stat.net_balance >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
        />
        <StatCard
          label="Efectivo"
          value={formatCurrency(stat.total_cash)}
          sub="Ventas en efectivo"
          icon={Banknote}
          colorClass="bg-success/10 text-success"
        />
        <StatCard
          label="Stock Crítico"
          value={String(lowStock.length)}
          sub={lowStock.length > 0 ? 'Ver productos →' : 'Todo en orden'}
          icon={AlertTriangle}
          colorClass={lowStock.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}
          onClick={lowStock.length > 0 ? onNavigateToLowStock : undefined}
        />
      </div>

      {/* Gráfico semanal */}
      {chart.length > 0 && (
        <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
          <h2 className="text-base font-semibold mb-4">Ventas y Gastos — Últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'ventas' ? 'Ventas' : name === 'gastos' ? 'Gastos' : 'Balance',
                ]}
              />
              <Legend formatter={(v) => v === 'ventas' ? 'Ventas' : v === 'gastos' ? 'Gastos' : 'Balance'} />
              <Bar dataKey="ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment breakdown */}
        <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
          <h2 className="text-base font-semibold mb-4">Desglose por Método de Pago</h2>
          {stat.gross_income === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin ventas registradas hoy</p>
          ) : (
            <div className="space-y-3">
              {([
                ['efectivo', stat.total_cash],
                ['debito', stat.total_debit],
                ['credito', stat.total_credit],
                ['transferencia', stat.total_transfer],
              ] as [string, number][]).filter(([, amount]) => amount > 0).map(([method, amount]) => {
                const meta = PAYMENT_LABELS[method] ?? { label: method, icon: ShoppingBag, color: 'text-foreground' }
                const Icon = meta.icon
                const pct = stat.gross_income > 0 ? (amount / stat.gross_income) * 100 : 0
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', meta.color)} />
                        <span className="text-sm font-medium">{meta.label}</span>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(amount)}</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
          <h2 className="text-base font-semibold mb-4">
            Productos con Stock Crítico
            {lowStock.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {lowStock.length}
              </span>
            )}
          </h2>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <TrendingUp className="h-8 w-8 text-success" />
              <p className="text-sm text-muted-foreground">Todo el inventario en niveles normales</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{p.stock}</p>
                    <p className="text-xs text-muted-foreground">mín {p.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top productos */}
      {topProducts.length > 0 && (() => {
        const unitProducts = topProducts.filter(p => p.unit_type !== 'peso')
        const pesoProducts = topProducts.filter(p => p.unit_type === 'peso')
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Más vendidos por cantidad (solo unidades) */}
              <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
                <h2 className="text-base font-semibold mb-4">Productos más vendidos — Últimos 30 días</h2>
                {unitProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin ventas registradas</p>
                ) : (
                  <div className="space-y-3">
                    {unitProducts.slice(0, 6).map((p, i) => {
                      const maxQty = unitProducts[0].total_qty
                      const pct = maxQty > 0 ? (p.total_qty / maxQty) * 100 : 0
                      return (
                        <div key={p.product_id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                              <span className="text-sm font-medium truncate max-w-[180px]">{p.name}</span>
                            </div>
                            <span className="text-sm font-bold text-foreground">{p.total_qty} uds</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mayor ganancia */}
              <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
                <h2 className="text-base font-semibold mb-4">Mayor ganancia generada — Últimos 30 días</h2>
                <div className="space-y-2">
                  {[...topProducts].sort((a, b) => b.profit - a.profit).slice(0, 6).map((p, i) => {
                    const maxProfit = Math.max(...topProducts.map((x) => x.profit))
                    const pct = maxProfit > 0 ? (p.profit / maxProfit) * 100 : 0
                    return (
                      <div key={p.product_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm font-medium truncate max-w-[160px]">{p.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-lg">{p.margin_percent}%</span>
                          </div>
                          <span className="text-sm font-bold text-success">{formatCurrency(p.profit)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Ganancia = (precio venta − costo) × unidades vendidas</p>
              </div>
            </div>

            {/* Fiambres más vendidos */}
            {pesoProducts.length > 0 && (
              <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
                <h2 className="text-base font-semibold mb-4">Fiambres más vendidos — Últimos 30 días</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pesoProducts.slice(0, 6).map((p, i) => {
                    const maxQty = pesoProducts[0].total_qty
                    const pct = maxQty > 0 ? (p.total_qty / maxQty) * 100 : 0
                    return (
                      <div key={p.product_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm font-medium truncate max-w-[130px]">{p.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">{p.total_qty}g</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-chart-5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, colorClass, onClick }: {
  label: string; value: string; sub: string; icon: React.ElementType; colorClass: string; onClick?: () => void
}) {
  return (
    <div
      className={cn('bg-card rounded-2xl shadow-sm p-4 border border-border', onClick && 'cursor-pointer hover:border-destructive/50 transition-colors')}
      onClick={onClick}
    >
      <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      <p className={cn('text-xs mt-1', onClick ? 'text-destructive font-medium' : 'text-muted-foreground/70')}>{sub}</p>
    </div>
  )
}
