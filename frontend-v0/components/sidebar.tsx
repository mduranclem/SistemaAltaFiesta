'use client'

import { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, Wallet,
  Menu, X, Settings, LogOut, TrendingUp,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/api'

export type View = 'dashboard' | 'pos' | 'inventory' | 'finances' | 'profit' | 'settings'

interface SidebarProps {
  active: View
  onNavigate: (view: View) => void
  onLogout: () => void
  businessName: string
  username: string
}

const navItems: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { view: 'pos', label: 'Vender', icon: ShoppingCart },
  { view: 'inventory', label: 'Stock', icon: Package },
  { view: 'finances', label: 'Gastos & Cierre', icon: Wallet },
  { view: 'profit',   label: 'Ganancias',      icon: TrendingUp },
  { view: 'settings', label: 'Configuración',  icon: Settings },
]

export function AppSidebar({ active, onNavigate, onLogout, businessName, username }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    try { await logout() } catch { /* ignore */ }
    onLogout()
  }

  const NavList = () => (
    <nav className="flex flex-col gap-1 p-3 flex-1">
      {navItems.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          onClick={() => { onNavigate(view); setMobileOpen(false) }}
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors text-sidebar-foreground',
            active === view
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  )

  const UserFooter = () => (
    <div className="p-3 border-t border-sidebar-border">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
          <Image src="/logo.png" alt="Alta Fiesta" width={32} height={32} className="object-cover w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">{username}</p>
          <p className="text-xs text-sidebar-foreground/50">Administrador</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar h-screen sticky top-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Alta Fiesta" width={36} height={36} className="object-cover w-full h-full" priority />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">{businessName}</p>
            <p className="text-xs text-sidebar-foreground/50 leading-tight">Sistema de Gestión</p>
          </div>
        </div>
        <NavList />
        <UserFooter />
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Alta Fiesta" width={32} height={32} className="object-cover w-full h-full" />
          </div>
          <span className="text-sm font-bold text-sidebar-foreground">{businessName}</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <div className={cn('lg:hidden fixed top-0 left-0 z-40 h-full w-64 bg-sidebar flex flex-col transform transition-transform duration-300', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl overflow-hidden shrink-0">
            <Image src="/logo.png" alt="Alta Fiesta" width={36} height={36} className="object-cover w-full h-full" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">{businessName}</p>
            <p className="text-xs text-sidebar-foreground/50 leading-tight">Sistema de Gestión</p>
          </div>
        </div>
        <NavList />
        <UserFooter />
      </div>
    </>
  )
}
