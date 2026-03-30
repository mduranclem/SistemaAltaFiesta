import { useEffect, useState } from 'react'
import { TrendingUp, Package, AlertTriangle, DollarSign, CreditCard, Smartphone, Banknote } from 'lucide-react'
import { financesApi, productsApi } from '../api/client'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0]
  const [summary, setSummary] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      financesApi.summary(today),
      productsApi.lowStock(),
    ]).then(([s, ls]) => {
      setSummary(s.data)
      setLowStock(ls.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [today])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      Cargando...
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">{today}</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Ventas del día"
          value={fmt(summary?.gross_income)}
          color="bg-blue-500"
          sub={`${summary?.sales_count || 0} transacciones`}
        />
        <StatCard
          icon={DollarSign}
          label="Balance neto"
          value={fmt(summary?.net_balance)}
          color="bg-emerald-500"
          sub={`Gastos: ${fmt(summary?.total_expenses)}`}
        />
        <StatCard
          icon={Banknote}
          label="Efectivo"
          value={fmt(summary?.total_cash)}
          color="bg-amber-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock crítico"
          value={lowStock.length}
          color="bg-red-500"
          sub="productos bajo mínimo"
        />
      </div>

      {/* Desglose por medio de pago */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-4">Desglose por medio de pago</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Efectivo', value: summary?.total_cash, icon: Banknote, color: 'text-amber-600' },
            { label: 'Débito', value: summary?.total_debit, icon: CreditCard, color: 'text-blue-600' },
            { label: 'Crédito', value: summary?.total_credit, icon: CreditCard, color: 'text-purple-600' },
            { label: 'Transferencia', value: summary?.total_transfer, icon: Smartphone, color: 'text-emerald-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center p-4 bg-slate-50 rounded-xl">
              <Icon size={20} className={color} />
              <p className="text-xs text-slate-500 mt-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stock crítico */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Productos con stock crítico
          </h2>
          <div className="space-y-2">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">SKU: {p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-bold">{p.stock} {p.weight_unit || 'u.'}</p>
                  <p className="text-xs text-slate-400">mín: {p.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
