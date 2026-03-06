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

interface Rfq {
  id: string
  projectName: string
  deliveryCity: string
  desiredDate: string | null
  status: 'draft' | 'sent' | 'closed'
  createdAt: string
}

const PAGE_SIZE = 25

export default function RfqsPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    projectName: '',
    deliveryCity: '',
    desiredDate: '',
    items: [] as { materialId: string; qty: string; notes: string }[],
  })

  useEffect(() => {
    fetchRfqs(page)
  }, [page])

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchRfqs = async (p: number) => {
    setLoading(true)
    try {
      const response = await apiFetch(`/api/rfqs?page=${p}&limit=${PAGE_SIZE}`)
      if (response.ok) {
        const result = await response.json()
        setRfqs(result.data)
        setTotal(result.total)
      }
    } catch (error) {
      console.error('Failed to fetch RFQs:', error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const fetchMaterials = async () => {
    try {
      const response = await apiFetch('/api/materials?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setMaterials(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { materialId: '', qty: '', notes: '' }],
    })
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await apiFetch('/api/rfqs', {
        method: 'POST',
        body: JSON.stringify({
          projectName: formData.projectName,
          deliveryCity: formData.deliveryCity,
          desiredDate: formData.desiredDate || undefined,
          items: formData.items.map(item => ({
            materialId: item.materialId,
            qty: parseFloat(item.qty),
            notes: item.notes || undefined,
          })),
        }),
      })
      if (response.ok) {
        setFormData({ projectName: '', deliveryCity: '', desiredDate: '', items: [] })
        setShowForm(false)
        fetchRfqs(page)
      } else {
        const err = await response.json().catch(() => null)
        alert('Eroare la creare: ' + (err?.message || response.statusText))
      }
    } catch (error) {
      console.error('Failed to create RFQ:', error)
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

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Se încarcă cererile de ofertă...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cereri de Ofertă</h1>
            <p className="text-slate-500 text-sm mt-1">{total} cereri înregistrate</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              showForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
            }`}
          >
            {showForm ? 'Anulează' : '+ Cerere Nouă'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Cerere de Ofertă Nouă</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nume Proiect *</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: Bloc Rezidențial Faza 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Oraș Livrare *</label>
                <input
                  type="text"
                  required
                  value={formData.deliveryCity}
                  onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: București"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Data Dorită Livrare</label>
                <input
                  type="date"
                  value={formData.desiredDate}
                  onChange={(e) => setFormData({ ...formData, desiredDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-slate-600">Articole *</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  + Adaugă Articol
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Material</label>
                    <select
                      required
                      value={item.materialId}
                      onChange={(e) => updateItem(index, 'materialId', e.target.value)}
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
                    <label className="block text-xs text-slate-500 mb-1">Cantitate</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Observații</label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Opțional"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="mt-5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {formData.items.length === 0 && (
                <p className="text-slate-400 text-sm py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Niciun articol adăugat. Apasă &quot;Adaugă Articol&quot; pentru a începe.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formData.items.length === 0}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm shadow-sm"
              >
                Creează Cererea
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

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Proiect</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Oraș Livrare</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Dorită</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Creat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rfqs.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                    <Link href={`/rfqs/${rfq.id}`} className="hover:text-blue-600 transition-colors">
                      {rfq.projectName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">{rfq.deliveryCity}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {rfq.desiredDate ? new Date(rfq.desiredDate).toLocaleDateString('ro-RO') : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                      {getStatusLabel(rfq.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(rfq.createdAt).toLocaleDateString('ro-RO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rfqs.length === 0 && !loading && (
            <div className="px-5 py-16 text-center">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-slate-500 text-sm">Nu există cereri de ofertă. Creează prima cerere folosind butonul de mai sus.</p>
            </div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} din {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                Pagina {page} din {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Următor →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
