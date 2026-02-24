'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'

interface Material {
  id: string
  canonicalName: string
  unit: string
}

interface AlertRule {
  id: string
  materialId: string | null
  ruleType: 'threshold' | 'volatility'
  paramsJson: Record<string, any>
  createdAt: string
}

interface Alert {
  id: string
  ruleId: string | null
  materialId: string | null
  triggeredAt: string
  payloadJson: Record<string, any>
  status: 'new' | 'ack'
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    materialId: '',
    ruleType: 'threshold' as 'threshold' | 'volatility',
    minPrice: '',
    maxPrice: '',
    volatilityThreshold: '',
  })

  useEffect(() => {
    Promise.all([fetchRules(), fetchAlerts(), fetchMaterials()]).finally(() =>
      setLoading(false),
    )
  }, [])

  const fetchRules = async () => {
    try {
      const res = await apiFetch('/api/alerts/rules')
      if (res.ok) setRules(await res.json())
    } catch (err) {
      console.error('Failed to fetch rules:', err)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await apiFetch('/api/alerts')
      if (res.ok) setAlerts(await res.json())
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  const fetchMaterials = async () => {
    try {
      const res = await apiFetch('/api/materials')
      if (res.ok) setMaterials(await res.json())
    } catch (err) {
      console.error('Failed to fetch materials:', err)
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const params: Record<string, any> = {}
    if (formData.ruleType === 'threshold') {
      if (formData.minPrice) params.minPrice = parseFloat(formData.minPrice)
      if (formData.maxPrice) params.maxPrice = parseFloat(formData.maxPrice)
    } else {
      if (formData.volatilityThreshold)
        params.volatilityThreshold = parseFloat(formData.volatilityThreshold) / 100
    }

    try {
      const res = await apiFetch('/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify({
          materialId: formData.materialId || undefined,
          ruleType: formData.ruleType,
          params,
        }),
      })
      if (res.ok) {
        setFormData({
          materialId: '',
          ruleType: 'threshold',
          minPrice: '',
          maxPrice: '',
          volatilityThreshold: '',
        })
        setShowForm(false)
        fetchRules()
      }
    } catch (err) {
      console.error('Failed to create rule:', err)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await apiFetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
      })
      if (res.ok) fetchRules()
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/ack`, {
        method: 'POST',
      })
      if (res.ok) fetchAlerts()
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  const getMaterialName = (materialId: string | null) => {
    if (!materialId) return 'Toate materialele'
    const m = materials.find((mat) => mat.id === materialId)
    return m ? m.canonicalName : materialId
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Se încarcă alertele...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Alerte</h1>
          <p className="text-slate-500 text-sm mt-1">Configurează reguli de alertă și monitorizează notificările</p>
        </div>

        {/* Alert Rules */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-900">Reguli de Alertă</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showForm
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
              }`}
            >
              {showForm ? 'Anulează' : '+ Regulă Nouă'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateRule} className="bg-slate-50 rounded-xl border border-slate-100 p-5 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Material</label>
                  <select
                    value={formData.materialId}
                    onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Toate materialele</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.canonicalName} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Tip Regulă</label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ruleType: e.target.value as 'threshold' | 'volatility',
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="threshold">Prag de Preț</option>
                    <option value="volatility">Volatilitate</option>
                  </select>
                </div>
              </div>

              {formData.ruleType === 'threshold' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Preț Minim (RON)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minPrice}
                      onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Alertă dacă prețul scade sub"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Preț Maxim (RON)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxPrice}
                      onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Alertă dacă prețul depășește"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Prag Volatilitate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.volatilityThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, volatilityThreshold: e.target.value })
                    }
                    className="w-full max-w-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="ex: 15"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Salvează Regula
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  Renunță
                </button>
              </div>
            </form>
          )}

          {rules.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tip</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parametri</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Creat</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {getMaterialName(rule.materialId)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                            rule.ruleType === 'threshold'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {rule.ruleType === 'threshold' ? 'Prag Preț' : 'Volatilitate'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {rule.ruleType === 'threshold' ? (
                          <>
                            {rule.paramsJson.minPrice != null && `Min: ${rule.paramsJson.minPrice} RON `}
                            {rule.paramsJson.maxPrice != null && `Max: ${rule.paramsJson.maxPrice} RON`}
                          </>
                        ) : (
                          <>Prag: {((rule.paramsJson.volatilityThreshold || 0) * 100).toFixed(1)}%</>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {new Date(rule.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                        >
                          Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-3xl mb-3 block">🔔</span>
              <p className="text-slate-400 text-sm">Nicio regulă de alertă configurată.</p>
            </div>
          )}
        </div>

        {/* Triggered Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Alerte Declanșate</h2>

          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-xl p-4 transition-colors ${
                    alert.status === 'new'
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            alert.status === 'new'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {alert.status === 'new' ? 'NOU' : 'CONFIRMAT'}
                        </span>
                        <span className="text-sm text-slate-600">
                          {getMaterialName(alert.materialId)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900">
                        {alert.payloadJson?.reason || JSON.stringify(alert.payloadJson)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {new Date(alert.triggeredAt).toLocaleString('ro-RO')}
                      </p>
                    </div>
                    {alert.status === 'new' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Confirmă
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-3xl mb-3 block">✅</span>
              <p className="text-slate-400 text-sm">Nicio alertă declanșată.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
