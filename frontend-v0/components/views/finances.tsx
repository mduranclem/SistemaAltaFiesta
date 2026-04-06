'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle,
  Clock,
  Banknote,
  Trash2,
  ShoppingCart,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
} from 'lucide-react'
import {
  getExpenses,
  getDailySummary,
  createExpense,
  updateExpense,
  deleteExpense,
  closeTurn,
  getCloseHistory,
  deleteClose,
  getSales,
  deleteSale,
  type Expense,
  type Sale,
  type DailySummary,
  type CloseRecord,
  formatCurrency,
  todayISO,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const EXPENSE_CATEGORIES = ['proveedor', 'servicio', 'salario', 'mantenimiento', 'otro']
const CATEGORY_LABELS: Record<string, string> = {
  proveedor: 'Proveedor', servicio: 'Servicio', salario: 'Salario',
  mantenimiento: 'Mantenimiento', otro: 'Otro',
}

function formatDateDisplay(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

function printCloseReport(report: CloseRecord, salesCount: number, expenses: Expense[]) {
  const businessName = 'Alta Fiesta'
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-AR')
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const expenseRows = expenses.map(e =>
    `<tr><td>${e.description}</td><td style="text-align:right">${fmt(e.amount)}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="text-align:center;color:#999">Sin gastos</td></tr>'

  const expectedCash = (report.opening_cash || 0) + report.total_cash - report.total_expenses
  const diff = report.total_cash - (report.expected_cash || expectedCash)

  const win = window.open('', '_blank', 'width=480,height=800')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Cierre de Turno — ${businessName}</title>
    <style>
      @media print { body { margin: 0; } button { display:none; } }
      body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; max-width: 440px; margin: 0 auto; color: #111; }
      h1 { text-align:center; font-size: 22px; margin: 0 0 2px; letter-spacing:-0.5px; }
      .sub { text-align:center; font-size:12px; color:#666; margin-bottom:16px; }
      hr { border:none; border-top:1px solid #ddd; margin:12px 0; }
      .section-title { font-size:10px; font-weight:bold; text-transform:uppercase; color:#888; letter-spacing:.8px; margin-bottom:6px; }
      table { width:100%; border-collapse:collapse; }
      td { padding:4px 2px; }
      .row { display:flex; justify-content:space-between; padding:3px 0; }
      .row .label { color:#555; }
      .row .value { font-weight:600; }
      .row.total { font-size:16px; font-weight:bold; border-top:2px solid #111; padding-top:8px; margin-top:4px; }
      .green { color:#16a34a; } .red { color:#dc2626; } .orange { color:#ea580c; }
      .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:bold; }
      .badge-green { background:#dcfce7; color:#166534; }
      .badge-red { background:#fee2e2; color:#991b1b; }
      .footer { text-align:center; font-size:11px; color:#aaa; margin-top:20px; border-top:1px solid #eee; padding-top:12px; }
      .print-btn { display:block; width:100%; padding:10px; background:#111; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer; margin-top:16px; }
    </style></head><body>
    <h1>🎉 ${businessName}</h1>
    <p class="sub">Cierre de Turno — ${report.close_date ? new Date(report.close_date + 'T12:00:00').toLocaleDateString('es-AR', {weekday:'long',day:'numeric',month:'long'}) : dateStr}</p>
    <p class="sub">Generado: ${dateStr} ${timeStr} · ${salesCount} ${salesCount === 1 ? 'venta' : 'ventas'}</p>
    <hr>

    <div class="section-title">💵 Ingresos por método de pago</div>
    ${report.total_cash > 0 ? `<div class="row"><span class="label">Efectivo</span><span class="value">${fmt(report.total_cash)}</span></div>` : ''}
    ${report.total_debit > 0 ? `<div class="row"><span class="label">Débito</span><span class="value">${fmt(report.total_debit)}</span></div>` : ''}
    ${report.total_credit > 0 ? `<div class="row"><span class="label">Crédito</span><span class="value">${fmt(report.total_credit)}</span></div>` : ''}
    ${report.total_transfer > 0 ? `<div class="row"><span class="label">Transferencia</span><span class="value">${fmt(report.total_transfer)}</span></div>` : ''}
    <div class="row"><span class="label"><b>Total ingresos</b></span><span class="value green">${fmt(report.gross_income)}</span></div>
    <hr>

    <div class="section-title">📋 Gastos del turno</div>
    <table>${expenseRows}</table>
    <div class="row" style="margin-top:6px"><span class="label"><b>Total gastos</b></span><span class="value red">${fmt(report.total_expenses)}</span></div>
    <hr>

    ${(report.opening_cash || 0) > 0 ? `
    <div class="section-title">🏧 Control de efectivo en caja</div>
    <div class="row"><span class="label">Fondo inicial (apertura)</span><span class="value">${fmt(report.opening_cash || 0)}</span></div>
    <div class="row"><span class="label">Ventas en efectivo</span><span class="value">${fmt(report.total_cash)}</span></div>
    <div class="row"><span class="label">Gastos pagados</span><span class="value red">- ${fmt(report.total_expenses)}</span></div>
    <div class="row"><span class="label"><b>Efectivo esperado en caja</b></span><span class="value orange">${fmt(expectedCash)}</span></div>
    <hr>
    ` : ''}

    <div class="row total">
      <span>Balance Neto del Día</span>
      <span class="${report.net_balance >= 0 ? 'green' : 'red'}">${fmt(report.net_balance)}</span>
    </div>

    <div class="footer">Alta Fiesta · Sistema de Gestión<br>${dateStr}</div>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>
  `)
  win.document.close()
}

export function FinancesView() {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [closes, setCloses] = useState<CloseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [closeReport, setCloseReport] = useState<CloseRecord | null>(null)
  const [closeSalesCount, setCloseSalesCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Edit expense
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [showAperturaModal, setShowAperturaModal] = useState(false)
  const [aperturaInput, setAperturaInput] = useState('')

  const aperturaKey = `apertura_${selectedDate}`
  const aperturaRegistrada = typeof window !== 'undefined' ? Number(localStorage.getItem(aperturaKey) ?? 0) : 0

  const isToday = selectedDate === todayISO()

  const load = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    try {
      const [exp, sum, cl, sal] = await Promise.all([
        getExpenses(date),
        getDailySummary(date),
        getCloseHistory(),
        getSales(date),
      ])
      setExpenses(exp)
      setSummary(sum)
      setCloses(cl)
      setSales(sal)
    } catch {
      setError('No se pudo cargar la información financiera')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(selectedDate) }, [load, selectedDate])

  function changeDate(delta: number) {
    setSelectedDate((d) => addDays(d, delta))
  }

  function handleApertura() {
    setAperturaInput(aperturaRegistrada > 0 ? String(aperturaRegistrada) : '')
    setShowAperturaModal(true)
  }

  function confirmApertura() {
    const amount = Number(aperturaInput) || 0
    localStorage.setItem(aperturaKey, String(amount))
    setShowAperturaModal(false)
  }

  async function handleClose() {
    setOpeningCash(aperturaRegistrada > 0 ? String(aperturaRegistrada) : '')
    setShowCloseModal(true)
  }

  async function confirmClose() {
    setShowCloseModal(false)
    try {
      const report = await closeTurn(selectedDate, Number(openingCash) || 0)
      setCloseSalesCount(sales.length)
      setCloseReport(report)
      printCloseReport(report, sales.length, expenses)
      await load(selectedDate)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cerrar el turno'
      setError(msg)
    }
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm('¿Eliminar este gasto?')) return
    try { await deleteExpense(id); await load(selectedDate) }
    catch { setError('Error al eliminar el gasto') }
  }

  async function handleCancelClose(id: number) {
    if (!confirm('¿Cancelar el cierre de turno? Se podrá volver a cerrar cuando quieras.')) return
    try {
      await deleteClose(id)
      setCloseReport(null)
      await load(selectedDate)
    } catch {
      setError('Error al cancelar el cierre')
    }
  }

  async function handleDeleteSale(id: number) {
    if (!confirm('¿Eliminar esta venta? El stock será restaurado.')) return
    try { await deleteSale(id); await load(selectedDate) }
    catch { setError('Error al eliminar la venta') }
  }

  async function handleUpdateExpense(id: number, data: Partial<Expense>) {
    try {
      await updateExpense(id, data)
      setEditingExpense(null)
      await load(selectedDate)
    } catch { setError('Error al editar el gasto') }
  }

  if (closeReport) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
            <CheckCircle className="h-9 w-9 text-success" />
          </div>
          <h2 className="text-xl font-bold">Cierre de Turno Completado</h2>
          <p className="text-sm text-muted-foreground mt-1">{formatDateDisplay(closeReport.close_date)}</p>
          <div className="mt-6 space-y-3">
            <ReportRow
              label={`Total Ventas${closeSalesCount > 0 ? ` (${closeSalesCount} ${closeSalesCount === 1 ? 'venta' : 'ventas'})` : ''}`}
              value={formatCurrency(closeReport.gross_income)}
              positive
            />
            <ReportRow label="Total Gastos" value={formatCurrency(closeReport.total_expenses)} negative />
            <div className="border-t border-border pt-3">
              <ReportRow label="Balance Neto" value={formatCurrency(closeReport.net_balance)} highlight positive={closeReport.net_balance >= 0} />
            </div>
            <ReportRow label="Efectivo en Caja" value={formatCurrency(closeReport.total_cash)} />
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setCloseReport(null)} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Continuar
            </button>
            <button
              onClick={() => handleCancelClose(closeReport.id)}
              className="w-full py-2.5 rounded-2xl border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              Cancelar cierre
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with date navigator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Gastos & Cierre</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-xl border border-border hover:bg-card">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium min-w-[130px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {isToday ? 'Hoy' : formatDateDisplay(selectedDate)}
          </div>
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sr-only"
            id="date-picker"
          />
          <button onClick={() => changeDate(1)} disabled={isToday} className="p-2 rounded-xl border border-border hover:bg-card disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(todayISO())} className="px-3 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10">
              Hoy
            </button>
          )}
          <button onClick={() => load(selectedDate)} disabled={loading} className="p-2 rounded-xl border border-border hover:bg-card">
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Register expense — only for today */}
          {isToday && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Registrar Gasto</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showForm ? 'Cerrar' : 'Nuevo Gasto'}
                </button>
              </div>
              {showForm && (
                <ExpenseForm onSave={async () => { await load(selectedDate); setShowForm(false) }} />
              )}
            </div>
          )}

          {/* Expenses list */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h2 className="font-semibold mb-4">
              Gastos {isToday ? 'del Día' : `del ${formatDateDisplay(selectedDate)}`}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({expenses.length} registros)</span>
            </h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin gastos registrados</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  editingExpense?.id === exp.id ? (
                    <ExpenseEditForm
                      key={exp.id}
                      expense={exp}
                      onSave={(data) => handleUpdateExpense(exp.id, data)}
                      onCancel={() => setEditingExpense(null)}
                    />
                  ) : (
                    <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 shrink-0">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{exp.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[exp.category] ?? exp.category} · {new Date(exp.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-destructive shrink-0">{formatCurrency(exp.amount)}</span>
                      <button onClick={() => setEditingExpense(exp)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Sales list */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h2 className="font-semibold mb-4">
              Ventas {isToday ? 'del Día' : `del ${formatDateDisplay(selectedDate)}`}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({sales.length} registros)</span>
            </h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : sales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin ventas registradas</p>
            ) : (
              <div className="space-y-2">
                {sales.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 shrink-0">
                      <ShoppingCart className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{sale.payment_method}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'} · {new Date(sale.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-success shrink-0">{formatCurrency(sale.total)}</span>
                    <button onClick={() => handleDeleteSale(sale.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Eliminar venta">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary & close */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h2 className="font-semibold mb-4">Resumen {isToday ? 'del Día' : formatDateDisplay(selectedDate)}</h2>
            {loading || !summary ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                <SummaryRow icon={TrendingUp} label="Ventas" value={formatCurrency(summary.gross_income)} colorClass="text-primary" />
                <SummaryRow icon={TrendingDown} label="Gastos" value={formatCurrency(summary.total_expenses)} colorClass="text-destructive" />
                <SummaryRow icon={Banknote} label="Efectivo" value={formatCurrency(summary.total_cash)} colorClass="text-success" />
                <div className="border-t border-border pt-3">
                  <SummaryRow icon={Wallet} label="Balance Neto" value={formatCurrency(summary.net_balance)} colorClass={summary.net_balance >= 0 ? 'text-success' : 'text-destructive'} bold />
                </div>
              </div>
            )}
          </div>

          {isToday && (
            <div className="space-y-2">
              <button
                onClick={handleApertura}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-success text-success font-semibold hover:bg-success/10 transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                {aperturaRegistrada > 0 ? `Apertura: ${formatCurrency(aperturaRegistrada)}` : 'Apertura de Caja'}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                <Clock className="h-5 w-5" />
                Cierre de Turno
              </button>
            </div>
          )}

          {closes.length > 0 && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h2 className="font-semibold mb-3 text-sm">Historial de Cierres</h2>
              <div className="space-y-2">
                {closes.slice(0, 7).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 group">
                    <div>
                      <p className="text-xs font-medium">{formatDateDisplay(c.close_date)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold', c.net_balance >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatCurrency(c.net_balance)}
                      </span>
                      <button
                        onClick={() => handleCancelClose(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        title="Cancelar cierre"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal apertura de caja */}
      {showAperturaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Apertura de Caja</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ingresá el dinero inicial en el cajón al comenzar el turno.
            </p>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fondo inicial ($)</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={aperturaInput}
              onChange={(e) => setAperturaInput(e.target.value)}
              className="w-full mt-1 mb-4 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAperturaModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmApertura}
                className="flex-1 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-semibold hover:bg-success/90 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fondo de caja */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Cerrar Turno</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ingresá el fondo de caja inicial (efectivo que pusiste al abrir el cajón). Dejalo en 0 si no usás fondo.
            </p>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fondo de apertura ($)</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full mt-1 mb-4 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseForm({ onSave }: { onSave: () => Promise<void> }) {
  const [form, setForm] = useState({ description: '', category: EXPENSE_CATEGORIES[0], amount: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    setSaving(true); setErr(null)
    try {
      await createExpense({ description: form.description, category: form.category, amount: Number(form.amount) })
      setForm({ description: '', category: EXPENSE_CATEGORIES[0], amount: '' })
      await onSave()
    } catch { setErr('Error al registrar el gasto') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ej: Compra de mercadería" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Categoría</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Monto ($)</label>
          <input required type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />Registrar Gasto</>}
      </button>
    </form>
  )
}

function ExpenseEditForm({ expense, onSave, onCancel }: {
  expense: Expense
  onSave: (data: Partial<Expense>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ description: expense.description, category: expense.category, amount: String(expense.amount) })

  return (
    <div className="p-3 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">Editando gasto</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
        </select>
        <input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <button onClick={() => onSave({ description: form.description, category: form.category as Expense['category'], amount: Number(form.amount) })} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        Guardar cambios
      </button>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value, colorClass, bold }: { icon: React.ElementType; label: string; value: string; colorClass: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className={cn('text-sm', bold ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
      </div>
      <span className={cn('text-sm', bold ? 'font-bold text-lg' : 'font-semibold', colorClass)}>{value}</span>
    </div>
  )
}

function ReportRow({ label, value, positive, negative, highlight }: { label: string; value: string; positive?: boolean; negative?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn('text-sm', highlight ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('font-bold', highlight ? 'text-xl' : 'text-base', positive && !negative && 'text-success', negative && 'text-destructive', !positive && !negative && 'text-foreground')}>
        {value}
      </span>
    </div>
  )
}
