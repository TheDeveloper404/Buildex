'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'

interface PriceStats {
  materialId: string
  city: string | null
  lastPrice: number | null
  avg30: number | null
  avg60: number | null
  avg90: number | null
  min90: number | null
  max90: number | null
  volatility90: number | null
  trend90: number | null
}

interface Material {
  id: string
  canonicalName: string
  unit: string
}

interface Supplier {
  id: string
  name: string
}

export default function PriceIntelligencePage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [city, setCity] = useState('')
  const [stats, setStats] = useState<PriceStats | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [priceForm, setPriceForm] = useState({
    materialId: '',
    supplierId: '',
    city: '',
    unitPrice: '',
    observedAt: '',
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await apiFetch('/api/materials?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setMaterials(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await apiFetch('/api/suppliers?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setSuppliers(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchStats = async () => {
    if (!selectedMaterial) return
    setLoading(true)

    try {
      const params = new URLSearchParams({ materialId: selectedMaterial })
      if (city) params.append('city', city)

      const historyParams = new URLSearchParams(params)
      if (selectedSupplier) historyParams.append('supplierId', selectedSupplier)
      if (dateFrom) historyParams.append('dateFrom', dateFrom)
      if (dateTo) historyParams.append('dateTo', dateTo)

      const [statsRes, historyRes] = await Promise.all([
        apiFetch(`/api/price/stats?${params}`),
        apiFetch(`/api/price/history?${historyParams}`),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Failed to fetch price data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTrendDirection = (trend90: number | null): string | null => {
    if (trend90 == null) return null
    if (trend90 > 2) return 'rising'
    if (trend90 < -2) return 'falling'
    return 'stable'
  }

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'rising': return '↑'
      case 'falling': return '↓'
      case 'stable': return '→'
      default: return '—'
    }
  }

  const getTrendColor = (trend: string | null) => {
    switch (trend) {
      case 'rising': return 'text-red-600'
      case 'falling': return 'text-green-600'
      case 'stable': return 'text-blue-600'
      default: return 'text-slate-400'
    }
  }

  const getTrendLabel = (trend: string | null) => {
    switch (trend) {
      case 'rising': return 'În creștere'
      case 'falling': return 'În scădere'
      case 'stable': return 'Stabil'
      default: return 'N/A'
    }
  }

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceForm.materialId || !priceForm.unitPrice) return

    setSaving(true)
    try {
      const response = await apiFetch('/api/price/history', {
        method: 'POST',
        body: JSON.stringify({
          materialId: priceForm.materialId,
          supplierId: priceForm.supplierId || undefined,
          city: priceForm.city || undefined,
          unitPrice: parseFloat(priceForm.unitPrice),
          observedAt: priceForm.observedAt || undefined,
        }),
      })

      if (response.ok) {
        setPriceForm({ materialId: '', supplierId: '', city: '', unitPrice: '', observedAt: '' })
        setShowAddForm(false)
        // Refresh stats if viewing the same material
        if (selectedMaterial === priceForm.materialId) {
          fetchStats()
        }
      }
    } catch (err) {
      console.error('Failed to add price:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inteligență Prețuri</h1>
            <p className="text-slate-500 text-sm mt-1">Analizează tendințele și statisticile de preț</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
          >
            + Adaugă Preț Manual
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Material</label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Selectează material...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.canonicalName} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Oraș (opțional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="ex: București"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Furnizor (opțional)</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Toți furnizorii</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">De la data</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Până la data</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchStats}
                disabled={!selectedMaterial || loading}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm shadow-sm transition-all"
              >
                {loading ? 'Se încarcă...' : 'Afișează Date'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Ultimul Preț</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.lastPrice != null ? `${stats.lastPrice.toFixed(2)}` : 'N/A'}
              </p>
              {stats.lastPrice != null && <p className="text-xs text-slate-400 mt-1">RON / {materials.find(m => m.id === selectedMaterial)?.unit ?? '—'}</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Medie 30 Zile</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.avg30 != null ? `${stats.avg30.toFixed(2)}` : 'N/A'}
              </p>
              {stats.avg30 != null && <p className="text-xs text-slate-400 mt-1">RON / {materials.find(m => m.id === selectedMaterial)?.unit ?? '—'}</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Min / Max</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.min90 != null && stats.max90 != null
                  ? `${stats.min90.toFixed(0)} / ${stats.max90.toFixed(0)}`
                  : 'N/A'}
              </p>
              {stats.min90 != null && <p className="text-xs text-slate-400 mt-1">RON</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Tendință</p>
              {(() => { const dir = getTrendDirection(stats.trend90); return (
              <p className={`text-2xl font-bold ${getTrendColor(dir)}`}>
                {getTrendIcon(dir)} {getTrendLabel(dir)}
              </p>
              ); })()}
            </div>
          </div>
        )}

        {/* Extended Stats */}
        {stats && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Statistici Detaliate</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Medie 60 Zile</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {stats.avg60 != null ? `${stats.avg60.toFixed(2)} RON` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Medie 90 Zile</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {stats.avg90 != null ? `${stats.avg90.toFixed(2)} RON` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Volatilitate</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {stats.volatility90 != null ? `${stats.volatility90.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tendintă %</p>
                <p className="text-lg font-semibold text-slate-900 mt-1">{stats.trend90 != null ? `${stats.trend90 > 0 ? '+' : ''}${stats.trend90.toFixed(1)}%` : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Price History Table */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Istoric Prețuri ({history.length})</h2>
              <button
                onClick={async () => {
                  const params = new URLSearchParams({ materialId: selectedMaterial })
                  if (city) params.append('city', city)
                  if (selectedSupplier) params.append('supplierId', selectedSupplier)
                  if (dateFrom) params.append('dateFrom', dateFrom)
                  if (dateTo) params.append('dateTo', dateTo)
                  try {
                    const res = await apiFetch(`/api/price/history/export?${params}`)
                    if (res.ok) {
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'istoric-preturi.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    }
                  } catch (err) {
                    console.error('Export failed:', err)
                  }
                }}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors"
              >
                ↓ Export CSV
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Furnizor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Oraș</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Preț Unitar</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monedă</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((entry: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {new Date(entry.observedAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">
                      {entry.supplierName || entry.supplier_name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {entry.city || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-900 text-right font-semibold">
                      {parseFloat(entry.unitPrice || entry.unit_price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {entry.currency || 'RON'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!stats && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-slate-500 text-sm">Selectează un material și apasă &quot;Afișează Date&quot; pentru a vedea statisticile de preț.</p>
          </div>
        )}
      </main>

      {/* Add Price Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Adaugă Preț Manual</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPrice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Material *</label>
                <select
                  required
                  value={priceForm.materialId}
                  onChange={(e) => setPriceForm({ ...priceForm, materialId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Selectează material...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.canonicalName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Furnizor</label>
                <select
                  value={priceForm.supplierId}
                  onChange={(e) => setPriceForm({ ...priceForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Selectează furnizor (opțional)...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Oraș</label>
                <input
                  type="text"
                  value={priceForm.city}
                  onChange={(e) => setPriceForm({ ...priceForm, city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: București"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Preț Unitar (RON) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceForm.unitPrice}
                  onChange={(e) => setPriceForm({ ...priceForm, unitPrice: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: 250.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data Observației</label>
                <input
                  type="date"
                  value={priceForm.observedAt}
                  onChange={(e) => setPriceForm({ ...priceForm, observedAt: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
