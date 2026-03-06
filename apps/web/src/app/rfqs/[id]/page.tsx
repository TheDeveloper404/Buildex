'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'

interface RfqDetail {
  id: string
  projectName: string
  deliveryCity: string
  desiredDate: string | null
  status: string
  items: Array<{
    id: string
    materialId: string
    materialName?: string
    unit?: string
    qty: number
    notes: string | null
  }>
  invites: Array<{
    id: string
    supplierId: string
    supplierName?: string
    supplierEmail?: string
    status: string
    expiresAt: string
  }>
}

interface ComparisonData {
  items: Array<{
    id: string
    materialId: string
    materialName: string
    unit: string
    qty: number
  }>
  offers: Array<{
    id: string
    supplierId: string
    supplierName?: string
    currency: string
    transportCost: number | null
    paymentTerms: string | null
    leadTimeDays: number | null
    isWinningOffer?: boolean
    items: Array<{
      rfqItemId: string
      unitPrice: number
      availableQty: number | null
      notes: string | null
    }>
  }>
}

export default function RfqDetailPage() {
  const params = useParams()
  const rfqId = params.id as string

  const [rfq, setRfq] = useState<RfqDetail | null>(null)
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; email: string; city: string }>>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  useEffect(() => {
    if (rfqId) {
      fetchRfq()
      fetchComparison()
    }
  }, [rfqId])

  const fetchRfq = async () => {
    try {
      const response = await apiFetch(`/api/rfqs/${rfqId}`)
      if (response.ok) {
        const data = await response.json()
        setRfq(data)
      }
    } catch (err) {
      console.error('Failed to fetch RFQ:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchComparison = async () => {
    try {
      const response = await apiFetch(`/api/offers/rfq/${rfqId}/compare`)
      if (response.ok) {
        const data = await response.json()
        setComparison(data)
      }
    } catch (err) {
      console.error('Failed to fetch comparison:', err)
    }
  }

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const response = await apiFetch('/api/suppliers?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setSuppliers(result.data)
        // Pre-select all suppliers
        setSelectedSuppliers(new Set(result.data.map((s: any) => s.id)))
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const openSupplierModal = () => {
    setShowSupplierModal(true)
    fetchSuppliers()
  }

  const toggleSupplier = (id: string) => {
    const newSelected = new Set(selectedSuppliers)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSuppliers(newSelected)
  }

  const handleSendRfq = async () => {
    if (!rfq || selectedSuppliers.size === 0) {
      setError('Selectează cel puțin un furnizor')
      return
    }
    setSending(true)
    setError('')

    try {
      const response = await apiFetch(`/api/rfqs/${rfqId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          supplierIds: Array.from(selectedSuppliers),
        }),
      })

      if (response.ok) {
        setShowSupplierModal(false)
        fetchRfq()
      } else {
        const data = await response.json()
        setError(data.message || 'Eroare la trimitere')
      }
    } catch (err) {
      setError('Eroare de rețea')
    } finally {
      setSending(false)
    }
  }

  const handleMarkWinner = async (offerId: string) => {
    try {
      const response = await apiFetch(`/api/offers/${offerId}/win`, {
        method: 'POST',
      })
      if (response.ok) {
        fetchComparison()
      }
    } catch (err) {
      console.error('Failed to mark winner:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600'
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'closed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'opened': return 'bg-blue-100 text-blue-700'
      case 'submitted': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Ciornă'
      case 'sent': return 'Trimisă'
      case 'closed': return 'Închisă'
      case 'pending': return 'În așteptare'
      case 'opened': return 'Deschisă'
      case 'submitted': return 'Depusă'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Se încarcă detaliile cererii...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-slate-500">Cererea de ofertă nu a fost găsită.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{rfq.projectName}</h1>
              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(rfq.status)}`}>
                {getStatusLabel(rfq.status)}
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Livrare: {rfq.deliveryCity}
              {rfq.desiredDate && ` | Data dorită: ${new Date(rfq.desiredDate).toLocaleDateString('ro-RO')}`}
            </p>
          </div>
          {rfq.status === 'draft' && (
            <button
              onClick={openSupplierModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
            >
              Trimite la Furnizori
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* RFQ Items */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Articole Solicitate</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cantitate</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Observații</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rfq.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900">{item.materialName || item.materialId}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{item.qty} {item.unit || ''}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{item.notes || <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Supplier Invites */}
        {rfq.invites && rfq.invites.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Invitații Furnizori</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Furnizor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiră</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rfq.invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{invite.supplierName || invite.supplierId}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{invite.supplierEmail || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(invite.status)}`}>
                        {getStatusLabel(invite.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {new Date(invite.expiresAt).toLocaleDateString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Offer Comparison */}
        {comparison && comparison.offers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Comparație Oferte</h2>
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/offers/rfq/${rfqId}/export`)
                    if (res.ok) {
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `comparatie-oferte-${rfqId.slice(0, 8)}.csv`
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
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[150px]">Material</th>
                    {comparison.offers.map((offer) => (
                      <th key={offer.id} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">
                        <div className="flex items-center gap-2">
                          {offer.supplierName || 'Furnizor'}
                          {offer.isWinningOffer && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Câștigător</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {comparison.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {item.materialName}
                        <span className="text-slate-400 ml-1 text-xs">({item.qty} {item.unit})</span>
                      </td>
                      {comparison.offers.map((offer) => {
                        const offerItem = offer.items.find(oi => oi.rfqItemId === item.id)
                        return (
                          <td key={offer.id} className="px-5 py-3 text-sm">
                            {offerItem ? (
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {offerItem.unitPrice.toFixed(2)} {offer.currency}
                                </span>
                                {offerItem.availableQty && (
                                  <span className="text-slate-400 ml-1 text-xs">
                                    (disp: {offerItem.availableQty})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td className="px-5 py-3 text-sm text-slate-700 font-medium">Transport</td>
                    {comparison.offers.map((offer) => (
                      <td key={offer.id} className="px-5 py-3 text-sm text-slate-600">
                        {offer.transportCost ? `${offer.transportCost.toFixed(2)} ${offer.currency}` : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm text-slate-700 font-medium">Condiții Plată</td>
                    {comparison.offers.map((offer) => (
                      <td key={offer.id} className="px-5 py-3 text-sm text-slate-600">
                        {offer.paymentTerms || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-5 py-3 text-sm text-slate-700 font-medium">Termen Livrare</td>
                    {comparison.offers.map((offer) => (
                      <td key={offer.id} className="px-5 py-3 text-sm text-slate-600">
                        {offer.leadTimeDays ? `${offer.leadTimeDays} zile` : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm text-slate-700 font-medium">Acțiune</td>
                    {comparison.offers.map((offer) => (
                      <td key={offer.id} className="px-5 py-3">
                        {!offer.isWinningOffer ? (
                          <button
                            onClick={() => handleMarkWinner(offer.id)}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                          >
                            Selectează Câștigător
                          </button>
                        ) : (
                          <span className="text-xs text-green-700 font-semibold">Selectat</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {comparison && comparison.offers.length === 0 && rfq.status === 'sent' && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="text-4xl mb-4 block">📬</span>
            <p className="text-slate-500 text-sm">Nicio ofertă primită încă. Se așteaptă răspunsul furnizorilor.</p>
          </div>
        )}
      </main>

      {/* Supplier Selection Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Selectează Furnizorii</h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loadingSuppliers ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Se încarcă furnizorii...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  Nu există furnizori. Adaugă furnizori din pagina Furnizori.
                </p>
              ) : (
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <label
                      key={supplier.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSuppliers.has(supplier.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.has(supplier.id)}
                        onChange={() => toggleSupplier(supplier.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{supplier.name}</p>
                        <p className="text-xs text-slate-500">{supplier.email} • {supplier.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {selectedSuppliers.size} furnizori selectați
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSendRfq}
                  disabled={sending || selectedSuppliers.size === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {sending ? 'Se trimite...' : 'Trimite RFQ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
