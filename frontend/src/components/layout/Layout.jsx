import Sidebar from './Sidebar'

export default function Layout({ current, onChange, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar current={current} onChange={onChange} />
      <main className="md:ml-60 min-h-screen">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
