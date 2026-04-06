'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Plus,
  Pencil,
  PackagePlus,
  PackageMinus,
  RefreshCw,
  X,
  AlertTriangle,
  Package,
  Trash2,
  TriangleAlert,
  Link,
} from 'lucide-react'
import {
  getProducts,
  createProduct,
  updateProduct,
  updateProductPrice,
  adjustStock,
  deactivateProduct,
  getComboItems,
  addComboItem,
  deleteComboItem,
  type Product,
  type ComboItem,
  formatCurrency,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type ModalMode = 'create' | 'edit' | 'stock' | 'delete' | 'combo' | null

export function InventoryView({ initialLowStockOnly = false }: { initialLowStockOnly?: boolean } = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockOnly)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProducts()
      setProducts(data)
    } catch {
      setError('No se pudo cargar el inventario')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = products.filter((p) => {
    if (lowStockOnly && !p.is_low_stock && p.stock > 0) return false
    if (lowStockOnly && p.stock === 0) return true
    if (lowStockOnly && p.is_low_stock) return true
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    )
  })

  function openEdit(p: Product) {
    setSelected(p)
    setModal('edit')
  }

  function openStock(p: Product) {
    setSelected(p)
    setModal('stock')
  }

  function openDelete(p: Product) {
    setSelected(p)
    setModal('delete')
  }

  function openCombo(p: Product) {
    setSelected(p)
    setModal('combo')
  }

  async function handleDelete() {
    if (!selected) return
    try {
      await deactivateProduct(selected.id)
      await load()
      setModal(null)
    } catch {
      setError('Error al eliminar el producto')
      setModal(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">Stock</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-border hover:bg-card transition-colors"
            aria-label="Actualizar"
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
              lowStockOnly
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Stock Crítico
          </button>
          <button
            onClick={() => { setSelected(null); setModal('create') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {lowStockOnly && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive flex-1">
            Mostrando solo productos con stock crítico ({filtered.length})
          </p>
          <button
            onClick={() => setLowStockOnly(false)}
            className="text-xs text-destructive underline hover:no-underline"
          >
            Ver todos
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Costo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Margen</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Precio de Venta</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        {search ? 'No se encontraron productos' : 'Sin productos en el inventario'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku} · {product.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {formatCurrency(product.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium">
                        {product.margin_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-success">
                      {formatCurrency(product.sale_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold',
                        product.stock === 0
                          ? 'bg-destructive/10 text-destructive'
                          : product.is_low_stock
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-success/10 text-success'
                      )}>
                        {product.unit_type === 'peso' ? `${product.stock}g` : product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openStock(product)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Ajustar stock"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </button>
                        {product.category === 'Promos' && (
                          <button
                            onClick={() => openCombo(product)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Configurar ingredientes del combo"
                          >
                            <Link className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openDelete(product)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <ProductModal
          mode="create"
          onClose={() => setModal(null)}
          onSave={async () => { await load(); setModal(null) }}
        />
      )}
      {modal === 'edit' && selected && (
        <ProductModal
          mode="edit"
          product={selected}
          onClose={() => setModal(null)}
          onSave={async () => { await load(); setModal(null) }}
        />
      )}
      {modal === 'stock' && selected && (
        <StockModal
          product={selected}
          onClose={() => setModal(null)}
          onSave={async () => { await load(); setModal(null) }}
        />
      )}
      {modal === 'delete' && selected && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <Trash2 className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Eliminar Producto</h2>
              <p className="text-sm text-muted-foreground mt-1">
                ¿Estás seguro de eliminar <strong>{selected.name}</strong>?<br />
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className={cn(buttonBase, 'flex-1 bg-muted text-foreground hover:bg-muted/80')}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className={cn(buttonBase, 'flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90')}
              >
                Eliminar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
      {modal === 'combo' && selected && (
        <ComboModal
          product={selected}
          allProducts={products}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

const CATEGORIES = ['Bebidas', 'Snacks', 'Lácteos', 'Fiambres', 'Hamburguesas', 'Panchos', 'Pizzas', 'Promos', 'Confitería', 'Otro']
const UNIT_TYPES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'peso', label: 'Peso (gramos)' },
]

function ProductModal({
  mode,
  product,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  product?: Product
  onClose: () => void
  onSave: () => Promise<void>
}) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? CATEGORIES[0],
    unit_type: product?.unit_type ?? UNIT_TYPES[0].value,
    cost_price: product?.cost_price ?? 0,
    margin_percent: product?.margin_percent ?? 30,
    min_stock: product?.min_stock ?? 5,
    stock: product?.stock ?? 0,
    package_size: product?.package_size ?? 1,
    retail_price: product?.retail_price ?? '',
    sale_price_override: product?.sale_price ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [manualPrice, setManualPrice] = useState(false)

  const recommendedPVP = Number(form.cost_price) * (1 + Number(form.margin_percent) / 100)
  const previewPVP = manualPrice && form.sale_price_override !== '' ? Number(form.sale_price_override) : recommendedPVP

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      if (mode === 'create') {
        await createProduct({
          name: form.name,
          sku: form.sku,
          category: form.category,
          unit_type: form.unit_type,
          cost_price: Number(form.cost_price),
          margin_percent: Number(form.margin_percent),
          min_stock: Number(form.min_stock),
          stock: Number(form.stock),
          is_active: true,
          package_size: Number(form.package_size) || 1,
          retail_price: form.retail_price !== '' ? Number(form.retail_price) : null,
          sale_price_override: manualPrice && form.sale_price_override !== '' ? Number(form.sale_price_override) : undefined,
        })
      } else if (product) {
        await updateProduct(product.id, {
          name: form.name,
          sku: form.sku,
          category: form.category,
          unit_type: form.unit_type,
          min_stock: Number(form.min_stock),
          package_size: Number(form.package_size) || 1,
          retail_price: form.retail_price !== '' ? Number(form.retail_price) : null,
          sale_price_override: manualPrice && form.sale_price_override !== '' ? Number(form.sale_price_override) : undefined,
        })
        await updateProductPrice(product.id, {
          cost_price: Number(form.cost_price),
          margin_percent: Number(form.margin_percent),
        })
      }
      await onSave()
    } catch {
      setErr('Error al guardar. Verifique los datos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-4">{mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" className="col-span-2">
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="SKU">
            <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Categoría">
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Tipo de unidad">
            <select value={form.unit_type} onChange={(e) => set('unit_type', e.target.value)} className={inputClass}>
              {UNIT_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </FormField>
          <FormField label={form.unit_type === 'peso' ? 'Stock Mínimo (g)' : 'Stock Mínimo'}>
            <input type="number" min={0} step={form.unit_type === 'peso' ? 1 : 0.01} value={form.min_stock} onChange={(e) => set('min_stock', e.target.value)} className={inputClass} />
          </FormField>
          {mode === 'create' && (
            <FormField label={form.unit_type === 'peso' ? 'Stock Inicial (g)' : 'Stock Inicial'} className="col-span-2">
              <input type="number" min={0} step={form.unit_type === 'peso' ? 1 : 0.01} value={form.stock} onChange={(e) => set('stock', e.target.value)} className={inputClass} />
            </FormField>
          )}
          <FormField label="Costo ($)">
            <input type="number" min={0} step="0.01" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Margen (%)">
            <input type="number" min={0} max={1000} step="0.1" value={form.margin_percent} onChange={(e) => set('margin_percent', e.target.value)} className={inputClass} />
          </FormField>
        </div>

        {/* Precio de venta */}
        <div className="border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Precio de venta</span>
            <button
              type="button"
              onClick={() => setManualPrice((v) => !v)}
              className={cn('text-xs px-2.5 py-1 rounded-lg font-medium transition-colors', manualPrice ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
            >
              {manualPrice ? 'Precio manual ✓' : 'Usar precio manual'}
            </button>
          </div>
          {manualPrice ? (
            <div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.sale_price_override}
                onChange={(e) => set('sale_price_override', e.target.value)}
                placeholder={`Recomendado: ${formatCurrency(recommendedPVP)}`}
                className={inputClass}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Margen con este precio: {form.cost_price > 0 && form.sale_price_override !== '' ? `${Math.round((Number(form.sale_price_override) / Number(form.cost_price) - 1) * 100)}%` : '—'}</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-success/10">
              <span className="text-sm text-success-foreground">PVP calculado ({form.margin_percent}% margen)</span>
              <span className="text-lg font-bold text-success">{formatCurrency(recommendedPVP)}</span>
            </div>
          )}
        </div>


        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={cn(buttonBase, 'flex-1 bg-muted text-foreground hover:bg-muted/80')}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={cn(buttonBase, 'flex-1 bg-primary text-primary-foreground hover:bg-primary/90')}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function StockModal({
  product,
  onClose,
  onSave,
}: {
  product: Product
  onClose: () => void
  onSave: () => Promise<void>
}) {
  const [qty, setQty] = useState(1)
  const [type, setType] = useState<'in' | 'out'>('in')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const delta = type === 'in' ? Math.abs(qty) : -Math.abs(qty)
      await adjustStock(product.id, delta)
      await onSave()
    } catch {
      setErr('Error al ajustar el stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-1">Ajustar Stock</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {product.name} · Stock actual: <strong>{product.unit_type === 'peso' ? `${product.stock}g` : product.stock}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('in')}
            className={cn('flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors',
              type === 'in' ? 'bg-success text-success-foreground border-success' : 'bg-card border-border hover:bg-muted'
            )}
          >
            <PackagePlus className="h-4 w-4" /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setType('out')}
            className={cn('flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors',
              type === 'out' ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-card border-border hover:bg-muted'
            )}
          >
            <PackageMinus className="h-4 w-4" /> Salida
          </button>
        </div>

        <FormField label={product.unit_type === 'peso' ? 'Cantidad (gramos)' : 'Cantidad'}>
          <input
            type="number"
            min={1}
            step={product.unit_type === 'peso' ? 1 : 0.001}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>

        <div className="p-3 rounded-xl bg-muted/40 flex justify-between text-sm">
          <span className="text-muted-foreground">Stock resultante</span>
          <span className={cn('font-bold', type === 'in' ? 'text-success' : 'text-destructive')}>
            {product.unit_type === 'peso'
              ? `${type === 'in' ? product.stock + qty : Math.max(0, product.stock - qty)}g`
              : type === 'in' ? product.stock + qty : Math.max(0, product.stock - qty)
            }
          </span>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={cn(buttonBase, 'flex-1 bg-muted text-foreground hover:bg-muted/80')}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={cn(buttonBase, 'flex-1 bg-primary text-primary-foreground hover:bg-primary/90')}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Confirmar'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const buttonBase = 'py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center'

function ComboModal({ product, allProducts, onClose }: {
  product: Product
  allProducts: Product[]
  onClose: () => void
}) {
  const [items, setItems] = useState<ComboItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIngredient, setSelectedIngredient] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getComboItems(product.id).then((data) => { setItems(data); setLoading(false) })
  }, [product.id])

  async function handleAdd() {
    if (!selectedIngredient || !qty || Number(qty) <= 0) return
    setSaving(true)
    try {
      const item = await addComboItem(product.id, {
        ingredient_product_id: Number(selectedIngredient),
        quantity: Number(qty),
      })
      setItems((prev) => [...prev, item])
      setSelectedIngredient('')
      setQty('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId: number) {
    await deleteComboItem(product.id, itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const available = allProducts.filter((p) => p.id !== product.id && p.unit_type !== 'peso')

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-1">Ingredientes del Combo</h2>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{product.name}</span> — Al vender este combo se descuentan automáticamente los siguientes productos del stock.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">Sin ingredientes configurados</p>
      ) : (
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="text-sm font-medium">{item.ingredient_name}</p>
                <p className="text-xs text-muted-foreground">Cantidad: {item.quantity} unidades</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agregar ingrediente</p>
        <div className="flex gap-2 mb-2">
          <select
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar producto...</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Cant."
            min={0.001}
            step={0.001}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !selectedIngredient || !qty}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Agregando...' : '+ Agregar ingrediente'}
        </button>
      </div>
    </ModalOverlay>
  )
}
