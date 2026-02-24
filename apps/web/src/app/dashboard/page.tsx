'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'

interface DashboardStats {
  counts: {
    materials: number
    suppliers: number
    rfqs: number
    activeRfqs: number
    offers: number
    unacknowledgedAlerts: number
  }
  recentRfqs: Array<{
    id: string
    projectName: string
    status: string
    createdAt: string
    offersReceived: number
  }>
  priceTrends: Array<{
    materialName: string
    city: string
    avgPrice: string
    minPrice: string
    maxPrice: string
  }>
}

const modules = [
  { href: '/materials', icon: '📦', color: 'blue', title: 'Materiale', desc: 'Catalog de materiale de construcții cu aliasuri' },
  { href: '/suppliers', icon: '🏢', color: 'emerald', title: 'Furnizori', desc: 'Gestionează rețeaua de furnizori' },
  { href: '/rfqs', icon: '📋', color: 'amber', title: 'Cereri de Ofertă', desc: 'Creează și trimite cereri către furnizori' },
  { href: '/prices', icon: '📊', color: 'purple', title: 'Inteligență Prețuri', desc: 'Statistici și tendințe de preț' },
  { href: '/alerts', icon: '🔔', color: 'red', title: 'Alerte', desc: 'Alerte de preț și volatilitate' },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-100 hover:border-blue-300',
  emerald: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
  amber: 'bg-amber-50 border-amber-100 hover:border-amber-300',
  purple: 'bg-purple-50 border-purple-100 hover:border-purple-300',
  red: 'bg-red-50 border-red-100 hover:border-red-300',
}

const iconBgMap: Record<string, string> = {
  blue: 'bg-blue-100',
  emerald: 'bg-emerald-100',
  amber: 'bg-amber-100',
  purple: 'bg-purple-100',
  red: 'bg-red-100',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600'
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'closed': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Ciornă'
      case 'sent': return 'Trimisă'
      case 'closed': return 'Închisă'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Panou Principal</h1>
          <p className="text-slate-500 mt-1">Bine ai venit! Alege un modul pentru a începe.</p>
        </div>

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Materiale</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.counts.materials}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Furnizori</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.counts.suppliers}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">RFQ-uri</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.counts.rfqs}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.counts.activeRfqs}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Oferte</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.counts.offers}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alerte</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.counts.unacknowledgedAlerts}</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {modules.map((m) => (
            <Link key={m.href} href={m.href}>
              <div className={`border rounded-xl p-5 transition-all duration-200 hover:shadow-md cursor-pointer h-full ${colorMap[m.color]}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${iconBgMap[m.color]}`}>
                  <span className="text-xl">{m.icon}</span>
                </div>
                <h2 className="text-base font-semibold text-slate-900 mb-1">{m.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent RFQs */}
        {!loading && stats && stats.recentRfqs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Cereri Recente</h2>
              <Link href="/rfqs" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                Vezi toate →
              </Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Proiect</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Oferte</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Creat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.recentRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/rfqs/${rfq.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                        {rfq.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                        {getStatusLabel(rfq.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-900">{rfq.offersReceived}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {new Date(rfq.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Price Trends */}
        {!loading && stats && stats.priceTrends.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Tendințe Prețuri (30 zile)</h2>
              <Link href="/prices" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                Detalii →
              </Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Oraș</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Medie</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Min</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.priceTrends.slice(0, 5).map((trend, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{trend.materialName}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{trend.city || '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-900 text-right font-semibold">{trend.avgPrice}</td>
                    <td className="px-5 py-3 text-sm text-green-600 text-right">{trend.minPrice}</td>
                    <td className="px-5 py-3 text-sm text-red-600 text-right">{trend.maxPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-3">Ghid de Utilizare</h2>
          <p className="text-blue-100 mb-4 text-sm">
            Mediu demonstrativ cu date reale din piața românească de construcții.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <span className="text-sm text-blue-50">Explorează catalogul de Materiale</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <span className="text-sm text-blue-50">Verifică lista de Furnizori</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <span className="text-sm text-blue-50">Creează o Cerere de Ofertă și trimite-o</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <span className="text-sm text-blue-50">Folosește link-ul furnizorului pentru oferte test</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
              <span className="text-sm text-blue-50">Compară ofertele pe pagina de detalii</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">6</span>
              <span className="text-sm text-blue-50">Configurează alerte pentru monitorizare</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
