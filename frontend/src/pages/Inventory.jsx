import { useEffect, useState } from 'react'
import { Search, Plus, Edit2, Package, AlertTriangle, X, Check } from 'lucide-react'
import { productsApi } from '../api/client'

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function Badge({ text, color }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', sku: '', category: '', unit_type: 'unidad',
    weight_unit: null, stock: 0, min_stock: 0,
    cost_price: '', margin_percent: 30,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pvp = form.cost_price
    ? (parseFloat(form.cost_price) * (1 + parseFloat(form.margin_percent) / 100)).toFixed(2)
    : '—'

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail[0]?.msg : (detail || 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? e.target.value : e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...extra}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {field('Nombre', 'name', 'text', { required: true })}
      <div className="grid grid-cols-2 gap-3">
        {field('SKU', 'sku', 'text', { required: !initial })}
        {field('Categoría', 'category')}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de unidad</label>
        <select
          value={form.unit_type}
          onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="unidad">Unidad (latas, paquetes…)</option>
          <option value="peso">Peso (gramos, kilos…)</option>
        </select>
      </div>

      {form.unit_type === 'peso' && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Unidad de peso</label>
          <select
            value={form.weight_unit || ''}
            onChange={e => setForm(f => ({ ...f, weight_unit: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar…</option>
            <option value="g">Gramos (g)</option>
            <option value="kg">Kilogramos (kg)</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {field('Stock actual', 'stock', 'number', { min: 0, step: '0.001' })}
        {field('Stock mínimo', 'min_stock', 'number', { min: 0, step: '0.001' })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field('Costo ($)', 'cost_price', 'number', { required: true, min: 0.01, step: '0.01' })}
        {field('Margen (%)', 'margin_percent', 'number', { min: 0, step: '0.1' })}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
        <p className="text-sm text-emerald-700">PVP calculado automáticamente</p>
        <p className="text-2xl font-bold text-emerald-700">${pvp}</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-200 rounded-xl py-2 text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-blue-600 text-white rounded-xl py-2 font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function StockModal({ product, onClose, onSaved }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await productsApi.adjustStock(product.id, parseFloat(qty), reason)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al ajustar stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-3 text-center">
        <p className="text-sm text-slate-500">{product.name}</p>
        <p className="text-xl font-bold text-slate-800">Stock actual: {product.stock}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Cantidad (+entrada / -salida)
        </label>
        <input
          type="number"
          step="0.001"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="ej: 50 o -10"
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Motivo (opcional)</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="ej: Compra a proveedor"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-200 rounded-xl py-2 text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-blue-600 text-white rounded-xl py-2 font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Ajustar'}
        </button>
      </div>
    </form>
  )
}

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | 'edit' | 'stock'
  const [selected, setSelected] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await productsApi.list({ active_only: false })
      setProducts(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(form) {
    const payload = {
      ...form,
      stock: parseFloat(form.stock) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      cost_price: parseFloat(form.cost_price),
      margin_percent: parseFloat(form.margin_percent),
      weight_unit: form.unit_type === 'peso' ? form.weight_unit : null,
    }
    await productsApi.create(payload)
    load()
  }

  async function handleEdit(form) {
    const payload = {
      name: form.name,
      category: form.category,
      min_stock: parseFloat(form.min_stock) || 0,
      cost_price: parseFloat(form.cost_price),
      margin_percent: parseFloat(form.margin_percent),
    }
    await productsApi.update(selected.id, payload)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 text-sm">{products.length} productos</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o categoría…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            No hay productos
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Costo</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Margen</th>
                  <th className="text-right px-4 py-3">PVP</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku} {p.category && `· ${p.category}`}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-slate-600">
                      {fmt(p.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <Badge text={`${p.margin_percent}%`} color="bg-blue-100 text-blue-700" />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {fmt(p.sale_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${p.is_low_stock ? 'text-red-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </span>
                      {p.is_low_stock && (
                        <AlertTriangle size={13} className="inline ml-1 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelected(p); setModal('stock') }}
                          className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                          title="Ajustar stock"
                        >
                          <Package size={15} />
                        </button>
                        <button
                          onClick={() => { setSelected(p); setModal('edit') }}
                          className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal === 'new' && (
        <Modal title="Nuevo producto" onClose={() => setModal(null)}>
          <ProductForm onSave={handleCreate} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Editar producto" onClose={() => setModal(null)}>
          <ProductForm initial={selected} onSave={handleEdit} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'stock' && selected && (
        <Modal title="Ajustar stock" onClose={() => setModal(null)}>
          <StockModal product={selected} onClose={() => setModal(null)} onSaved={load} />
        </Modal>
      )}
    </div>
  )
}
