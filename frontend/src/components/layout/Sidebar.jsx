import { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, Wallet, X, Menu, Store
} from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'Caja Rápida', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'finances', label: 'Gastos y Cierre', icon: Wallet },
]

export default function Sidebar({ current, onChange }) {
  const [open, setOpen] = useState(false)

  const NavItems = () => (
    <nav className="flex flex-col gap-1 mt-4">
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => { onChange(id); setOpen(false) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
              ${active
                ? 'bg-blue-600 text-white font-semibold shadow'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Botón hamburguesa — solo en móvil */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-800 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu size={22} />
      </button>

      {/* Overlay móvil */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar móvil (drawer) */}
      <aside className={`
        md:hidden fixed top-0 left-0 h-full w-64 bg-slate-800 z-50 p-4
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white">
            <Store size={24} className="text-blue-400" />
            <span className="font-bold text-lg">Alta Fiesta</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <NavItems />
      </aside>

      {/* Sidebar desktop (fijo) */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-slate-800 p-4 fixed top-0 left-0">
        <div className="flex items-center gap-2 text-white mb-2 px-2">
          <Store size={26} className="text-blue-400" />
          <span className="font-bold text-xl">Alta Fiesta</span>
        </div>
        <NavItems />
      </aside>
    </>
  )
}
