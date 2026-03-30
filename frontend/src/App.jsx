import { useState } from 'react'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Finances from './pages/Finances'

const PAGES = {
  dashboard: Dashboard,
  pos: POS,
  inventory: Inventory,
  finances: Finances,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const Page = PAGES[page]

  return (
    <Layout current={page} onChange={setPage}>
      <Page />
    </Layout>
  )
}
