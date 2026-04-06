'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, KeyRound, Store, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'
import { getSettings, updateSettings, changePassword, type AppSettings } from '@/lib/api'
import { cn } from '@/lib/utils'

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export function SettingsView() {
  const [form, setForm] = useState<AppSettings>({
    business_name: '',
    business_subtitle: '',
    currency: 'ARS',
    debit_surcharge_percent: 4,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cambiar contraseña
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    getSettings()
      .then((s) => setForm(s))
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const updated = await updateSettings(form)
      setForm(updated)
      localStorage.setItem('business_name', updated.business_name)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (pwForm.new !== pwForm.confirm) {
      setPwError('Las contraseñas nuevas no coinciden')
      return
    }
    if (pwForm.new.length < 4) {
      setPwError('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setPwSaving(true)
    try {
      await changePassword(pwForm.new)
      setPwForm({ current: '', new: '', confirm: '' })
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch {
      setPwError('Error al cambiar la contraseña')
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Datos del negocio */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Datos del Negocio</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre del negocio</label>
            <input
              required
              value={form.business_name}
              onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
              className={cn(inputClass, 'mt-1')}
              placeholder="Mi Negocio"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subtítulo / Rubro</label>
            <input
              value={form.business_subtitle}
              onChange={(e) => setForm((f) => ({ ...f, business_subtitle: e.target.value }))}
              className={cn(inputClass, 'mt-1')}
              placeholder="Ej: Kiosco · Almacén · Ferretería"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className={cn(inputClass, 'mt-1')}
            >
              <option value="ARS">ARS — Peso Argentino</option>
              <option value="USD">USD — Dólar</option>
              <option value="CLP">CLP — Peso Chileno</option>
              <option value="UYU">UYU — Peso Uruguayo</option>
              <option value="PYG">PYG — Guaraní</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Recargo débito (%)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.debit_surcharge_percent}
                onChange={(e) => setForm((f) => ({ ...f, debit_surcharge_percent: Number(e.target.value) }))}
                className={cn(inputClass, 'max-w-[140px]')}
              />
              <span className="text-sm text-muted-foreground">% sobre el total con tarjeta de débito</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Se aplica automáticamente al seleccionar débito en el POS.</p>
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Guardado correctamente</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Cambiar Contraseña</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nueva contraseña</label>
            <input
              required
              type="password"
              value={pwForm.new}
              onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
              className={cn(inputClass, 'mt-1')}
              placeholder="Mínimo 4 caracteres"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confirmar contraseña</label>
            <input
              required
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              className={cn(inputClass, 'mt-1')}
            />
          </div>

          {pwError && <p className="text-sm text-destructive">{pwError}</p>}

          {pwSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Contraseña actualizada</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {pwSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Cambiar contraseña
          </button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground">
        Usuario administrador: los cambios se aplican de inmediato.
      </p>
    </div>
  )
}
