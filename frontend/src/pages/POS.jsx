import { useEffect, useState } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Banknote, CreditCard, Smartphone, Building2 } from 'lucide-react'
import { productsApi, salesApi } from '../api/client'

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'bg-amber-500 hover:bg-amber-600' },
  { id: 'debito', label: 'Débito', icon: CreditCard, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'credito', label: 'Crédito', icon: CreditCard, color: 'bg-purple-500 hover:bg-purple-600' },
  { id: 'transferencia', label: 'Transferencia', icon: Smartphone, color: 'bg-emerald-500 hover:bg-emerald-600' },
]

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export default function POS() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [payment, setPayment] = useState('efectivo')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    productsApi.list({ active_only: true, limit: 500 })
      .then(r => setProducts(r.data))
      .catch(console.error)
  }, [])

  const filtered = products.filter(p =>
    p.stock > 0 && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
  )

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        quantity: 1,
        max: product.stock,
      }]
    })
  }

  function updateQty(product_id, delta) {
    setCart(prev => prev
      .map(i => i.product_id === product_id
        ? { ...i, quantity: Math.min(Math.max(1, i.quantity + delta), i.max) }
        : i
      )
      .filter(i => i.quantity > 0)
    )
  }

  function removeFromCart(product_id) {
    setCart(prev => prev.filter(i => i.product_id !== product_id))
  }

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  async function handleSale() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const res = await salesApi.create({
        payment_method: payment,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      setSuccess({ id: res.data.id, total: res.data.total, payment })
      setCart([])
      setSearch('')
      // Refrescar stock
      productsApi.list({ active_only: true, limit: 500 }).then(r => setProducts(r.data))
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al registrar la venta')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check size={40} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">¡Venta registrada!</h2>
          <p className="text-slate-500">Venta #{success.id}</p>
          <p className="text-4xl font-bold text-emerald-600 mt-2">{fmt(success.total)}</p>
          <p className="text-slate-400 capitalize mt-1">{success.payment}</p>
        </div>
        <button
          onClick={() => setSuccess(null)}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 text-lg"
        >
          Nueva venta
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      {/* Panel izquierdo: productos */}
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Caja Rápida</h1>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md hover:border-blue-300 border border-slate-100 transition active:scale-95"
            >
              <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">{p.name}</p>
              <p className="text-xs text-slate-400 mt-1">Stock: {p.stock}</p>
              <p className="text-emerald-600 font-bold text-base mt-2">{fmt(p.sale_price)}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-10 text-slate-400">
              Sin resultados
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: carrito */}
      <div className="lg:w-80 bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-blue-600" />
          <h2 className="font-semibold text-slate-800">Carrito</h2>
          {cart.length > 0 && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {cart.length} ítem{cart.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Ítems */}
        <div className="flex-1 space-y-2 max-h-64 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Seleccioná productos</p>
          ) : cart.map(item => (
            <div key={item.product_id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-emerald-600">{fmt(item.unit_price)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product_id, -1)}
                  className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center">
                  <Minus size={13} />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => updateQty(item.product_id, 1)}
                  className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center">
                  <Plus size={13} />
                </button>
                <button onClick={() => removeFromCart(item.product_id)}
                  className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-500">Total</span>
            <span className="text-2xl font-bold text-slate-800">{fmt(total)}</span>
          </div>

          {/* Métodos de pago */}
          <p className="text-xs text-slate-400 mb-2 font-medium">MÉTODO DE PAGO</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setPayment(id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl text-white text-xs font-semibold transition
                  ${payment === id ? color + ' ring-2 ring-offset-1 ring-slate-400' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSale}
            disabled={cart.length === 0 || loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:opacity-40 transition active:scale-95"
          >
            {loading ? 'Procesando…' : `Cobrar ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
