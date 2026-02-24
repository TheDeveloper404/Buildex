'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'

interface Material {
  id: string
  canonicalName: string
  unit: string
  specJson: Record<string, any> | null
}

const specKeyLabels: Record<string, string> = {
  rezistenta: 'Rezistență',
  resistance: 'Rezistență',
  strength: 'Rezistență',
  greutate: 'Greutate',
  weight: 'Greutate',
  densitate: 'Densitate',
  density: 'Densitate',
  grosime: 'Grosime',
  thickness: 'Grosime',
  lungime: 'Lungime',
  length: 'Lungime',
  latime: 'Lățime',
  width: 'Lățime',
  inaltime: 'Înălțime',
  height: 'Înălțime',
  diametru: 'Diametru',
  diameter: 'Diametru',
  culoare: 'Culoare',
  color: 'Culoare',
  tip: 'Tip',
  type: 'Tip',
  clasa: 'Clasă',
  class: 'Clasă',
  grad: 'Grad',
  grade: 'Grad',
  marca: 'Marcă',
  brand: 'Marcă',
  material: 'Material',
  compozitie: 'Compoziție',
  composition: 'Compoziție',
  dimensiune: 'Dimensiune',
  size: 'Dimensiune',
  capacitate: 'Capacitate',
  capacity: 'Capacitate',
  presiune: 'Presiune',
  pressure: 'Presiune',
  temperatura: 'Temperatură',
  temperature: 'Temperatură',
  standard: 'Standard',
  certificare: 'Certificare',
  certification: 'Certificare',
}

function translateSpecKey(key: string): string {
  const lower = key.toLowerCase().replace(/[_-]/g, '')
  return specKeyLabels[lower] || key.charAt(0).toUpperCase() + key.slice(1)
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ canonicalName: '', unit: '' })
  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>([])

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await apiFetch('/api/materials')
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSpecRow = () => {
    setSpecRows([...specRows, { key: '', value: '' }])
  }

  const updateSpecRow = (index: number, field: 'key' | 'value', val: string) => {
    const rows = [...specRows]
    rows[index] = { ...rows[index], [field]: val }
    setSpecRows(rows)
  }

  const removeSpecRow = (index: number) => {
    setSpecRows(specRows.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const specJson: Record<string, any> = {}
      for (const row of specRows) {
        if (row.key.trim()) {
          specJson[row.key.trim()] = row.value.trim()
        }
      }

      const response = await apiFetch('/api/materials', {
        method: 'POST',
        body: JSON.stringify({
          canonicalName: formData.canonicalName,
          unit: formData.unit,
          specJson: Object.keys(specJson).length > 0 ? specJson : undefined,
        }),
      })
      if (response.ok) {
        setFormData({ canonicalName: '', unit: '' })
        setSpecRows([])
        setShowForm(false)
        fetchMaterials()
      } else {
        const err = await response.json().catch(() => null)
        console.error('Save failed:', err)
        alert('Eroare la salvare: ' + (err?.message || response.statusText))
      }
    } catch (error) {
      console.error('Failed to create material:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Se încarcă materialele...</p>
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
            <h1 className="text-2xl font-bold text-slate-900">Materiale</h1>
            <p className="text-slate-500 text-sm mt-1">{materials.length} materiale în catalog</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              showForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
            }`}
          >
            {showForm ? 'Anulează' : '+ Adaugă Material'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Material Nou</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Denumire</label>
                <input
                  type="text"
                  required
                  value={formData.canonicalName}
                  onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: Ciment Portland 32.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Unitate de Măsură</label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ex: kg, mc, buc"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-600">Specificații</label>
                <button
                  type="button"
                  onClick={addSpecRow}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  + Adaugă Specificație
                </button>
              </div>

              {specRows.map((row, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => updateSpecRow(index, 'key', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="ex: Rezistență, Greutate, Dimensiune"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateSpecRow(index, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="ex: 32.5 MPa, 50 kg, 120x60 cm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecRow(index)}
                    className="px-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}

              {specRows.length === 0 && (
                <p className="text-xs text-slate-400 py-2">Nicio specificație adăugată. Opțional.</p>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm shadow-sm"
              >
                Salvează Material
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Denumire</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unitate</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Specificații</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{material.canonicalName}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                      {material.unit}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {material.specJson && Object.keys(material.specJson).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(material.specJson).map(([key, val]) => (
                          <span key={key} className="inline-flex items-center px-2.5 py-1 bg-blue-50/50 border border-blue-100 rounded-lg text-xs">
                            <span className="text-blue-400 font-medium mr-1.5">{translateSpecKey(key)}</span>
                            <span className="text-slate-700 font-semibold">{String(val)}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {materials.length === 0 && (
            <div className="px-5 py-16 text-center">
              <span className="text-4xl mb-4 block">📦</span>
              <p className="text-slate-500 text-sm">Nu există materiale. Adaugă primul material folosind butonul de mai sus.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
