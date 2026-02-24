'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SupplierOfferPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    currency: 'RON',
    transportCost: '',
    paymentTerms: '',
    leadTimeDays: '',
    notes: '',
    items: [] as any[],
  })

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Token lipsă')
      return
    }

    fetch(`/api/supplier/offer?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setContext(data)
          setFormData(prev => ({
            ...prev,
            items: data.items.map((item: any) => ({
              rfqItemId: item.id,
              unitPrice: '',
              availableQty: '',
              leadTimeDaysOverride: '',
              notes: '',
            })),
          }))
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Nu s-a putut încărca cererea')
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/supplier/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
          transportCost: formData.transportCost ? parseFloat(formData.transportCost) : undefined,
          leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
          items: formData.items.map(item => ({
            ...item,
            unitPrice: parseFloat(item.unitPrice),
            availableQty: item.availableQty ? parseFloat(item.availableQty) : undefined,
            leadTimeDaysOverride: item.leadTimeDaysOverride ? parseInt(item.leadTimeDaysOverride) : undefined,
          })),
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Nu s-a putut trimite oferta')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Se încarcă cererea...</p>
        </div>
      </div>
    )
  }

  if (error && !context) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-8 max-w-md text-center">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-green-50/50 border border-green-200 rounded-2xl p-8 max-w-md text-center">
          <span className="text-4xl mb-4 block">✅</span>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Ofertă Depusă!</h2>
          <p className="text-green-700 text-sm">Mulțumim pentru depunerea ofertei. Achizitorul va analiza propunerea dumneavoastră.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <span className="text-blue-500 text-lg">📋</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Depunere Ofertă</h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Proiect</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{context?.rfq?.projectName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Oraș Livrare</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{context?.rfq?.deliveryCity}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Articole</h2>
            
            {context?.items?.map((item: any, index: number) => (
              <div key={item.id} className="border-b border-slate-100 py-5 last:border-0 last:pb-0 first:pt-0">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{item.materialName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Solicitat: {item.qty} {item.unit}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Preț Unitar (RON) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.items[index]?.unitPrice}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index] = { ...newItems[index], unitPrice: e.target.value }
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cantitate Disponibilă</label>
                    <input
                      type="number"
                      value={formData.items[index]?.availableQty}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index] = { ...newItems[index], availableQty: e.target.value }
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Termen (zile)</label>
                    <input
                      type="number"
                      value={formData.items[index]?.leadTimeDaysOverride}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index] = { ...newItems[index], leadTimeDaysOverride: e.target.value }
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Observații</label>
                    <input
                      type="text"
                      value={formData.items[index]?.notes}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index] = { ...newItems[index], notes: e.target.value }
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Detalii Ofertă</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Monedă</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="RON">RON (Lei)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Cost Transport</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.transportCost}
                  onChange={(e) => setFormData({ ...formData, transportCost: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Condiții de Plată</label>
                <input
                  type="text"
                  placeholder="ex: 30 zile"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Termen Livrare (zile)</label>
                <input
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Observații Generale</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/25"
          >
            {submitting ? 'Se trimite...' : 'Depune Oferta'}
          </button>
        </form>
      </div>
    </div>
  )
}
