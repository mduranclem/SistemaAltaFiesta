'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle, RefreshCw,
  Banknote, CreditCard, Smartphone, AlertTriangle, Search, Printer,
  FileText, Pencil, Check,
} from 'lucide-react'
import { getProducts, createSale, getSettings, getComboItems, type Product, type SaleItem, formatCurrency } from '@/lib/api'
import { cn } from '@/lib/utils'

type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia'

interface CartItem extends SaleItem {
  name: string
  sale_price: number      // para peso: precio por KG; para unidad: precio por unidad
  unit_type: string
  package_size: number
  retail_price: number | null
  is_retail: boolean
  price_override?: number  // precio mayorista manual
}

interface CompletedSale {
  total: number
  paymentMethod: PaymentMethod
  items: CartItem[]
  notes: string
  time: string
  discountAmount: number
  surchargeAmount: number
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { method: 'efectivo', label: 'Efectivo', icon: Banknote },
  { method: 'debito', label: 'Débito', icon: CreditCard },
  { method: 'credito', label: 'Crédito', icon: CreditCard },
  { method: 'transferencia', label: 'Transfer.', icon: Smartphone },
]

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia',
}

export function POSView() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [creditSurchargeValue, setCreditSurchargeValue] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  const [weightInput, setWeightInput] = useState<Record<number, string>>({})
  const [debitSurchargePercent, setDebitSurchargePercent] = useState(4)
  const [businessName, setBusinessName] = useState('Alta Fiesta')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showTicket, setShowTicket] = useState(false)
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const [data, settings] = await Promise.all([
        getProducts({ active_only: true }),
        getSettings(),
      ])
      setProducts(data)
      setDebitSurchargePercent(settings.debit_surcharge_percent)
      setBusinessName(settings.business_name || 'Alta Fiesta')
    } catch {
      setError('No se pudo cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  async function addComboToCart(product: Product) {
    try {
      const [comboItems, freshProducts] = await Promise.all([
        getComboItems(product.id),
        getProducts({ active_only: true }),
      ])
      setProducts(freshProducts)
      const cartQty = cart.find((i) => i.product_id === product.id)?.quantity ?? 0
      const qtyToAdd = cartQty + 1
      const missing = comboItems.filter((ci) => {
        const ing = freshProducts.find((p) => p.id === ci.ingredient_product_id)
        return !ing || ing.stock < ci.quantity * qtyToAdd
      })
      if (missing.length > 0) {
        setError(`Stock insuficiente para la promo: falta ${missing.map((m) => m.ingredient_name).join(', ')}`)
        return
      }
      setCart((prev) => {
        const exists = prev.find((i) => i.product_id === product.id && !i.is_retail)
        if (exists) return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        return [...prev, {
          product_id: product.id, quantity: 1, name: product.name,
          sale_price: product.sale_price, unit_type: product.unit_type,
          package_size: 1, retail_price: null, is_retail: false,
        }]
      })
    } catch {
      setError('Error al verificar disponibilidad del combo')
    }
  }

  function addToCart(product: Product, asRetail = false) {
    if (product.unit_type === 'peso') {
      setWeightInput((prev) => ({ ...prev, [product.id]: prev[product.id] ?? '' }))
      return
    }
    // Para paquete/suelto usamos claves distintas en el carrito
    const cartKey = asRetail ? -(product.id) : product.id  // retail = id negativo
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id && i.is_retail === asRetail)
      if (exists) {
        return prev.map((i) => (i.product_id === product.id && i.is_retail === asRetail) ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        product_id: product.id,
        quantity: 1,
        name: product.name,
        sale_price: asRetail && product.retail_price ? product.retail_price : product.sale_price,
        unit_type: product.unit_type,
        package_size: product.package_size ?? 1,
        retail_price: product.retail_price,
        is_retail: asRetail,
      }]
    })
  }

  function addWeightToCart(product: Product, grams: number) {
    if (grams <= 0 || grams > product.stock) return
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id && i.unit_type === 'peso')
      if (exists) {
        return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + grams } : i)
      }
      return [...prev, {
        product_id: product.id, quantity: grams, name: product.name,
        sale_price: product.sale_price, unit_type: product.unit_type,
        package_size: 1, retail_price: null, is_retail: false,
      }]
    })
    setWeightInput((prev) => { const n = { ...prev }; delete n[product.id]; return n })
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0)
    )
  }

  function updateGrams(productId: number, grams: number) {
    if (grams <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== productId))
    } else {
      setCart((prev) => prev.map((i) => i.product_id === productId ? { ...i, quantity: grams } : i))
    }
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId))
  }

  function cartItemKey(item: CartItem): string {
    return `${item.product_id}_${item.is_retail ? 'retail' : 'pack'}`
  }

  function effectivePrice(item: CartItem): number {
    return item.price_override !== undefined ? item.price_override : item.sale_price
  }

  function itemPrice(item: CartItem): number {
    const price = effectivePrice(item)
    if (item.unit_type === 'peso') return (price / 1000) * item.quantity
    return price * item.quantity
  }

  function confirmPriceEdit(item: CartItem) {
    const val = parseFloat(editingPriceValue)
    if (!isNaN(val) && val >= 0) {
      setCart((prev) => prev.map((i) =>
        cartItemKey(i) === cartItemKey(item) ? { ...i, price_override: val } : i
      ))
    }
    setEditingPriceKey(null)
    setEditingPriceValue('')
  }
  const subtotal = cart.reduce((sum, i) => sum + itemPrice(i), 0)
  const discountAmount = discountValue
    ? discountType === 'percent'
      ? Math.min(subtotal * (Number(discountValue) / 100), subtotal)
      : Math.min(Number(discountValue), subtotal)
    : 0
  const surchargeAmount =
    paymentMethod === 'debito'
      ? Math.round(subtotal * (debitSurchargePercent / 100) * 100) / 100
      : paymentMethod === 'credito' && creditSurchargeValue
      ? Math.round(subtotal * (Number(creditSurchargeValue) / 100) * 100) / 100
      : 0
  const total = Math.max(subtotal - discountAmount + surchargeAmount, 0)

  async function handleCheckout() {
    if (cart.length === 0 || processing) return
    setProcessing(true)
    setError(null)
    try {
      await createSale({
        payment_method: paymentMethod,
        items: cart.map(({ product_id, quantity, is_retail, price_override }) => ({
          product_id, quantity, is_retail,
          ...(price_override !== undefined ? { unit_price_override: price_override } : {}),
        })),
        discount: discountAmount || undefined,
        surcharge: surchargeAmount || undefined,
        notes: notes || undefined,
      })
      setCompletedSale({
        total,
        paymentMethod,
        items: [...cart],
        notes,
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        discountAmount,
        surchargeAmount,
      })
      setCart([])
      setNotes('')
      setDiscountValue('')
      setCreditSurchargeValue('')
      setCashReceived('')
      await loadProducts()
    } catch {
      setError('Error al procesar la venta. Intente nuevamente.')
    } finally {
      setProcessing(false)
    }
  }

  function handlePrint() {
    if (!completedSale) return
    const businessNameForPrint = businessName || 'Alta Fiesta'
    const printWindow = window.open('', '_blank', 'width=380,height=600')
    if (!printWindow) return
    const lines = completedSale.items.map((i) => {
      const isPeso = i.unit_type === 'peso'
      const qty = isPeso ? `${i.quantity}g` : `${i.quantity}`
      const price = i.price_override !== undefined ? i.price_override : i.sale_price
      const lineTotal = isPeso ? (price / 1000) * i.quantity : price * i.quantity
      return `<tr><td>${i.name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${formatCurrency(lineTotal)}</td></tr>`
    }).join('')
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Ticket</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto; }
        h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
        p { text-align: center; margin: 2px 0; font-size: 12px; color: #666; }
        hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 2px; }
        .total { font-size: 15px; font-weight: bold; text-align: right; }
        .footer { text-align: center; font-size: 11px; color: #888; margin-top: 10px; }
      </style></head><body>
      <h2>${businessNameForPrint}</h2>
      <p>${new Date().toLocaleDateString('es-AR')} — ${completedSale.time}</p>
      <hr>
      <table>
        <tr style="font-size:11px;color:#666"><td>Producto</td><td style="text-align:right">Cant.</td><td style="text-align:right">Subtotal</td></tr>
        <tr><td colspan="3"><hr style="margin:4px 0"></td></tr>
        ${lines}
      </table>
      <hr>
      ${completedSale.discountAmount > 0 ? `<p style="text-align:right">Descuento: − ${formatCurrency(completedSale.discountAmount)}</p>` : ''}
      ${completedSale.surchargeAmount > 0 ? `<p style="text-align:right">Recargo: + ${formatCurrency(completedSale.surchargeAmount)}</p>` : ''}
      <p class="total">TOTAL: ${formatCurrency(completedSale.total)}</p>
      <p style="margin-top:4px">Pago: ${PAYMENT_LABELS[completedSale.paymentMethod]}</p>
      ${completedSale.notes ? `<p style="color:#555">Nota: ${completedSale.notes}</p>` : ''}
      <p class="footer">¡Gracias por su compra!</p>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `)
    printWindow.document.close()
  }

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === null || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (completedSale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-14 w-14 text-success" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Venta Exitosa</h2>
          <p className="text-3xl font-bold text-primary mt-2">{formatCurrency(completedSale.total)}</p>
          <p className="text-sm text-muted-foreground mt-1">cobrado con {PAYMENT_LABELS[completedSale.paymentMethod]}</p>
          {completedSale.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{completedSale.notes}"</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 border border-border rounded-2xl font-semibold text-sm hover:bg-card transition-colors"
          >
            <Printer className="h-5 w-5" />
            Imprimir Ticket
          </button>
          <button
            onClick={() => setCompletedSale(null)}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Products grid */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Vender</h1>
          <button onClick={loadProducts} disabled={loading} className="p-2 rounded-xl border border-border hover:bg-card transition-colors" aria-label="Actualizar productos">
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filtros por categoría */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              selectedCategory === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-card rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((product) => {
              const isPeso = product.unit_type === 'peso'
              const isCombo = product.is_combo
              const comboAvailable = product.combo_available !== false
              const isWeightOpen = isPeso && product.id in weightInput
              const hasFraccional = !isCombo && product.retail_price && (product.package_size ?? 1) > 1
              return (
                <div
                  key={product.id}
                  className={cn(
                    'flex flex-col justify-between p-4 rounded-2xl border text-left transition-all',
                    isCombo && comboAvailable ? 'bg-card border-primary/30 hover:shadow-md hover:border-primary/60 cursor-pointer'
                      : isCombo && !comboAvailable ? 'bg-muted border-border opacity-60'
                      : product.stock === 0 ? 'bg-muted border-border opacity-60'
                      : product.is_low_stock ? 'bg-card border-destructive/40'
                      : 'bg-card border-border',
                    !isCombo && !isWeightOpen && !hasFraccional && product.stock > 0 && 'hover:shadow-md hover:border-primary/50 cursor-pointer'
                  )}
                  onClick={() => {
                    if (isCombo && comboAvailable) { addComboToCart(product); return }
                    if (!isCombo && !isWeightOpen && !hasFraccional && product.stock > 0) addToCart(product)
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                      {isCombo && <span className="shrink-0 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">PROMO</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-bold text-primary">
                      {isPeso ? `${formatCurrency(product.sale_price)}/kg` : formatCurrency(product.sale_price)}
                    </p>
                    {hasFraccional && (
                      <p className="text-xs text-muted-foreground">{formatCurrency(product.retail_price!)}/u suelto</p>
                    )}
                    {isCombo ? (
                      <p className={cn('text-xs font-medium', comboAvailable ? 'text-primary/70' : 'text-destructive')}>
                        {comboAvailable ? 'Disponible según stock' : `Sin stock: ${product.combo_missing ?? 'ingrediente'}`}
                      </p>
                    ) : (
                      <p className={cn('text-xs font-medium', product.is_low_stock ? 'text-destructive' : 'text-muted-foreground')}>
                        {product.stock === 0 ? 'Sin stock' : isPeso ? `Stock: ${product.stock}g` : `Stock: ${product.stock}`}
                      </p>
                    )}
                  </div>
                  {hasFraccional && product.stock > 0 && (
                    <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => addToCart(product, false)}
                        className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Paquete
                      </button>
                      <button
                        onClick={() => addToCart(product, true)}
                        className="flex-1 py-1.5 rounded-xl border border-primary text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                      >
                        Suelto
                      </button>
                    </div>
                  )}
                  {isWeightOpen && (
                    <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          type="number"
                          min={1}
                          max={product.stock}
                          value={weightInput[product.id]}
                          onChange={(e) => setWeightInput((p) => ({ ...p, [product.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addWeightToCart(product, Number(weightInput[product.id]))
                            if (e.key === 'Escape') setWeightInput((p) => { const n = { ...p }; delete n[product.id]; return n })
                          }}
                          placeholder="gramos"
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-primary bg-background text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={() => addWeightToCart(product, Number(weightInput[product.id]))}
                          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                        >+</button>
                        <button
                          onClick={() => setWeightInput((p) => { const n = { ...p }; delete n[product.id]; return n })}
                          className="px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground"
                        >✕</button>
                      </div>
                      {weightInput[product.id] && Number(weightInput[product.id]) > 0 && (
                        <p className="text-xs text-primary font-medium text-center">
                          {formatCurrency((product.sale_price / 1000) * Number(weightInput[product.id]))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 gap-2">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No se encontraron productos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart panel */}
      <div className="lg:w-96 xl:w-[440px] shrink-0">
        <div className="bg-card rounded-2xl border border-border shadow-sm sticky top-4">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Carrito</h2>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Agregue productos al carrito</p>
            ) : (
              cart.map((item) => {
                const key = cartItemKey(item)
                const isEditingThisPrice = editingPriceKey === key
                const effPrice = effectivePrice(item)
                return (
                <div key={key} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}{item.is_retail ? ' (suelto)' : ''}</p>
                    {isEditingThisPrice ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          step="0.01"
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmPriceEdit(item)
                            if (e.key === 'Escape') { setEditingPriceKey(null); setEditingPriceValue('') }
                          }}
                          onBlur={() => confirmPriceEdit(item)}
                          className="w-20 text-xs px-1 py-0.5 rounded border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button onMouseDown={() => confirmPriceEdit(item)} className="p-0.5 text-primary">
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className={cn('text-xs', item.price_override !== undefined ? 'text-amber-500 font-semibold' : 'text-muted-foreground')}>
                          {item.unit_type === 'peso'
                            ? `${formatCurrency(effPrice)}/kg`
                            : `${formatCurrency(effPrice)} c/u`}
                          {item.price_override !== undefined && ' (mayor)'}
                        </p>
                        <button
                          onClick={() => { setEditingPriceKey(key); setEditingPriceValue(String(effPrice)) }}
                          className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar precio mayorista"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {item.unit_type === 'peso' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateGrams(item.product_id, Number(e.target.value))}
                        className="w-16 text-center text-sm font-bold px-1 py-0.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">g</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product_id, -1)} className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-card">
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value)
                          if (!isNaN(v) && v > 0) setCart((prev) => prev.map((i) => i.product_id === item.product_id && i.is_retail === item.is_retail ? { ...i, quantity: v } : i))
                          else if (e.target.value === '') setCart((prev) => prev.map((i) => i.product_id === item.product_id && i.is_retail === item.is_retail ? { ...i, quantity: 0 } : i))
                        }}
                        onBlur={(e) => { if (!parseInt(e.target.value) || parseInt(e.target.value) <= 0) setCart((prev) => prev.filter((i) => !(i.product_id === item.product_id && i.is_retail === item.is_retail))) }}
                        className="w-12 text-center text-sm font-bold px-1 py-0.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button onClick={() => updateQty(item.product_id, 1)} className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-card">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="text-sm font-bold text-right w-20">{formatCurrency(itemPrice(item))}</div>
                  <button onClick={() => removeFromCart(item.product_id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )})
            )}
          </div>

          <div className="px-4 py-3 border-t border-border space-y-2">
            {/* Descuento */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Descuento (opcional)</p>
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-border overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setDiscountType('amount')}
                    className={cn('px-3 py-1.5 transition-colors', discountType === 'amount' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
                  >$</button>
                  <button
                    onClick={() => setDiscountType('percent')}
                    className={cn('px-3 py-1.5 transition-colors', discountType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
                  >%</button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? 'Ej: 10' : 'Ej: 500'}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Recargo crédito manual */}
            {paymentMethod === 'credito' && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Recargo crédito (%)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={creditSurchargeValue}
                    onChange={(e) => setCreditSurchargeValue(e.target.value)}
                    placeholder="Ej: 15"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {/* Recargo débito automático */}
            {paymentMethod === 'debito' && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Recargo débito ({debitSurchargePercent}%)</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+ {formatCurrency(surchargeAmount)}</span>
              </div>
            )}

            {/* Vuelto — solo efectivo */}
            {paymentMethod === 'efectivo' && cart.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Paga con ($)</p>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`Mín. ${Math.ceil(total)}`}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {cashReceived && Number(cashReceived) >= total && (
                  <div className="mt-1.5 flex justify-between items-center px-3 py-2 rounded-xl bg-success/10 border border-success/30">
                    <span className="text-xs font-medium text-success">Vuelto</span>
                    <span className="text-base font-bold text-success">
                      {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(cashReceived) - total)}
                    </span>
                  </div>
                )}
                {cashReceived && Number(cashReceived) < total && (
                  <p className="mt-1 text-xs text-destructive font-medium px-1">
                    Falta {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(total - Number(cashReceived))}
                  </p>
                )}
              </div>
            )}

            {/* Totales */}
            {(discountAmount > 0 || surchargeAmount > 0) && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-muted-foreground">{formatCurrency(subtotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-success font-medium">Descuento</span>
                <span className="text-success font-medium">− {formatCurrency(discountAmount)}</span>
              </div>
            )}
            {surchargeAmount > 0 && paymentMethod === 'credito' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-500 font-medium">Recargo crédito</span>
                <span className="text-amber-500 font-medium">+ {formatCurrency(surchargeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="px-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ method, label, icon: Icon }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                    paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/50'
                  )}
                >
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Notas (opcional)</p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: cliente habitual, entrega a domicilio..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="mx-4 mb-3 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          <div className="p-4 pt-0">
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <>Cobrar {total > 0 && formatCurrency(total)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
