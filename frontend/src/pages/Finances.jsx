import { useEffect, useState } from 'react'
import { Plus, X, TrendingDown, TrendingUp, DollarSign, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { financesApi } from '../api/client'

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

const CATEGORIES = [
  { id: 'proveedor', label: 'Proveedor' },
  { id: 'servicio', label: 'Servicio' },
  { id: 'salario', label: 'Salario' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'otro', label: 'Otro' },
]

export default function Finances() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ description: '', category: 'otro', amount: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeResult, setCloseResult] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      const [s, e] = await Promise.all([
        financesApi.summary(date),
        financesApi.listExpenses(date),
      ])
      setSummary(s.data)
      setExpenses(e.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { load() }, [date])

  async function handleExpense(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await financesApi.createExpense({
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
      })
      setForm({ description: '', category: 'otro', amount: '', notes: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el gasto')
    } finally {
      setSaving(false)
    }
  }

  async function handleClose() {
    if (!confirm(`¿Confirmar cierre de caja para ${date}?`)) return
    setClosing(true)
    try {
      const res = await financesApi.closeCash(date)
      setCloseResult(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cerrar caja')
    } finally {
      setClosing(false)
    }
  }

  if (closeResult) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Cierre de caja registrado</h2>
          <p className="text-slate-500 text-sm mb-4">{closeResult.close_date}</p>

          <div className="space-y-2 text-left bg-slate-50 rounded-xl p-4">
            {[
              { label: 'Ingresos brutos', value: closeResult.gross_income, color: 'text-emerald-600' },
              { label: 'Efectivo', value: closeResult.total_cash, color: 'text-amber-600' },
              { label: 'Débito', value: closeResult.total_debit, color: 'text-blue-600' },
              { label: 'Crédito', value: closeResult.total_credit, color: 'text-purple-600' },
              { label: 'Transferencia', value: closeResult.total_transfer, color: 'text-teal-600' },
              { label: 'Gastos', value: closeResult.total_expenses, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className={`font-semibold ${color}`}>{fmt(value)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-slate-800">Balance neto</span>
              <span className="font-bold text-xl text-emerald-700">{fmt(closeResult.net_balance)}</span>
            </div>
          </div>

          <button
            onClick={() => { setCloseResult(null); load() }}
            className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gastos y Cierre</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Resumen del día */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ingresos', value: summary.gross_income, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Gastos', value: summary.total_expenses, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Efectivo', value: summary.total_cash, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Balance', value: summary.net_balance, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={color} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Formulario gasto */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-600" />
            Registrar gasto
          </h2>
          <form onSubmit={handleExpense} className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Descripción</label>
              <input
                type="text"
                required
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ej: Compra de mercadería"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Monto ($)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Registrar gasto'}
            </button>
          </form>
        </div>

        {/* Lista de gastos + cierre */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-700 mb-3">Gastos del día</h2>
            {expenses.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Sin gastos registrados</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{exp.description}</p>
                      <p className="text-xs text-slate-400 capitalize">{exp.category}</p>
                    </div>
                    <p className="text-red-600 font-bold">{fmt(exp.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón cierre */}
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            {closing ? 'Procesando…' : '🔒 Cierre de Turno'}
          </button>
          <p className="text-xs text-slate-400 text-center">
            Esto guarda el balance final del día de forma permanente.
          </p>
        </div>
      </div>
    </div>
  )
}
