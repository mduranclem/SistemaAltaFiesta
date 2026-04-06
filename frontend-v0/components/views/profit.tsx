'use client'

import { useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, RefreshCw,
  AlertTriangle, X, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { getProfitReport, type ProfitReport, formatCurrency, todayISO } from '@/lib/api'
import { cn } from '@/lib/utils'

function subtractDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: 'Hoy',          getDates: () => ({ from: todayISO(), to: todayISO() }) },
  { label: 'Esta semana',  getDates: () => ({ from: subtractDays(todayISO(), 6), to: todayISO() }) },
  { label: 'Este mes',     getDates: () => ({ from: subtractDays(todayISO(), 29), to: todayISO() }) },
  { label: '3 meses',      getDates: () => ({ from: subtractDays(todayISO(), 89), to: todayISO() }) },
]

export function ProfitView() {
  const [dateFrom, setDateFrom] = useState(subtractDays(todayISO(), 6))
  const [dateTo,   setDateTo]   = useState(todayISO())
  const [report,   setReport]   = useState<ProfitReport | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState(1) // "Esta semana" por defecto

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProfitReport(from, to)
      setReport(data)
    } catch {
      setError('No se pudo cargar el reporte de ganancias')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar al montar
  useState(() => { load(dateFrom, dateTo) })

  function applyPreset(index: number) {
    const { from, to } = PRESETS[index].getDates()
    setDateFrom(from)
    setDateTo(to)
    setActivePreset(index)
    load(from, to)
  }

  function applyCustom() {
    setActivePreset(-1)
    load(dateFrom, dateTo)
  }

  const daysInRange = report?.by_day.length ?? 0
  const showChart = daysInRange > 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ganancias</h1>

      {/* Selector de período */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <p className="text-sm font-medium text-muted-foreground mb-3">Período</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                activePreset === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Desde</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayISO()}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={applyCustom}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Consultar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && report && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Ingresos totales"
              value={formatCurrency(report.total_revenue)}
              sub="ventas del período"
              icon={TrendingUp}
              color="text-primary"
              bg="bg-primary/10"
            />
            <KpiCard
              label="Costo de productos"
              value={formatCurrency(report.total_cogs)}
              sub="costo de lo vendido"
              icon={TrendingDown}
              color="text-destructive"
              bg="bg-destructive/10"
            />
            <KpiCard
              label="Ganancia bruta"
              value={formatCurrency(report.gross_profit)}
              sub="ingresos − costo"
              icon={Wallet}
              color={report.gross_profit >= 0 ? 'text-success' : 'text-destructive'}
              bg={report.gross_profit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
              highlight
            />
            <KpiCard
              label="Margen de ganancia"
              value={`${report.profit_margin}%`}
              sub="sobre el total vendido"
              icon={ChevronDown}
              color={report.profit_margin >= 20 ? 'text-success' : report.profit_margin >= 10 ? 'text-warning' : 'text-destructive'}
              bg={report.profit_margin >= 20 ? 'bg-success/10' : report.profit_margin >= 10 ? 'bg-warning/10' : 'bg-destructive/10'}
            />
          </div>

          {/* Gráfico por día */}
          {showChart && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h2 className="text-base font-semibold mb-4">Ganancia por día</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.by_day} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number, name: string) => [
                    formatCurrency(v),
                    name === 'revenue' ? 'Ingresos' : name === 'cogs' ? 'Costo' : 'Ganancia',
                  ]} />
                  <Legend formatter={(v) => v === 'revenue' ? 'Ingresos' : v === 'cogs' ? 'Costo' : 'Ganancia'} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cogs"    fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit"  fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla por día */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold">Detalle por día</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingresos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Costo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ganancia</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_day.filter(d => d.revenue > 0 || d.profit !== 0).map((d) => {
                    const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : '—'
                    return (
                      <tr key={d.date} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{d.date}</td>
                        <td className="px-4 py-3 text-right text-primary font-medium">{formatCurrency(d.revenue)}</td>
                        <td className="px-4 py-3 text-right text-destructive">{formatCurrency(d.cogs)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', d.profit >= 0 ? 'text-success' : 'text-destructive')}>
                          {formatCurrency(d.profit)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{margin}{margin !== '—' ? '%' : ''}</td>
                      </tr>
                    )
                  })}
                  {report.by_day.every(d => d.revenue === 0) && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin ventas en este período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            * Ganancia bruta = ingresos por ventas − costo de los productos vendidos. No incluye gastos operativos (alquiler, servicios, etc.).
          </p>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, bg, highlight }: {
  label: string; value: string; sub: string
  icon: React.ElementType; color: string; bg: string; highlight?: boolean
}) {
  return (
    <div className={cn('bg-card rounded-2xl shadow-sm p-4 border', highlight ? 'border-success/30' : 'border-border')}>
      <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3', bg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <p className={cn('font-bold leading-tight', highlight ? 'text-3xl' : 'text-2xl', color)}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
    </div>
  )
}
