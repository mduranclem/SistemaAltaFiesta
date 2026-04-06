'use client'

import { useState, useEffect } from 'react'
import { AppSidebar, type View } from '@/components/sidebar'
import { LoginScreen } from '@/components/login'
import { DashboardView } from '@/components/views/dashboard'
import { POSView } from '@/components/views/pos'
import { InventoryView } from '@/components/views/inventory'
import { FinancesView } from '@/components/views/finances'
import { SettingsView } from '@/components/views/settings'
import { ProfitView } from '@/components/views/profit'
import { getToken, getSettings } from '@/lib/api'

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [businessName, setBusinessName] = useState('Alta Fiesta')
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const stored = getToken()
    const storedUser = localStorage.getItem('auth_username') ?? ''
    const storedBusiness = localStorage.getItem('business_name')
    if (storedBusiness) setBusinessName(storedBusiness)
    if (stored) {
      setToken(stored)
      setUsername(storedUser)
      // Refresh business name from server
      getSettings()
        .then((s) => {
          setBusinessName(s.business_name)
          localStorage.setItem('business_name', s.business_name)
        })
        .catch(() => {/* use cached value */})
    }
    setBooting(false)
  }, [])

  function handleLogin(user: string) {
    setToken(getToken())
    setUsername(user)
    getSettings()
      .then((s) => {
        setBusinessName(s.business_name)
        localStorage.setItem('business_name', s.business_name)
      })
      .catch(() => {})
  }

  function handleLogout() {
    setToken(null)
    setUsername('')
    setActiveView('dashboard')
  }

  if (booting) {
    return <div className="min-h-screen bg-background" />
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} businessName={businessName} />
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <AppSidebar
        active={activeView}
        onNavigate={(view) => { setInventoryLowStockOnly(false); setActiveView(view) }}
        onLogout={handleLogout}
        businessName={businessName}
        username={username}
      />
      <main className="flex-1 min-w-0 p-4 lg:p-6 lg:overflow-y-auto">
        {activeView === 'dashboard' && (
          <DashboardView onNavigateToLowStock={() => { setInventoryLowStockOnly(true); setActiveView('inventory') }} />
        )}
        {activeView === 'pos' && <POSView />}
        {activeView === 'inventory' && (
          <InventoryView initialLowStockOnly={inventoryLowStockOnly} key={inventoryLowStockOnly ? 'low' : 'all'} />
        )}
        {activeView === 'finances' && <FinancesView />}
        {activeView === 'profit'   && <ProfitView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
