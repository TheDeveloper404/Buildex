'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { PASSWORD_RULES, validatePassword, passwordStrength } from '@buildex/shared'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(formData.password)
  const strengthLabel = ['Foarte slabă', 'Slabă', 'Medie', 'Bună', 'Puternică'][strength]
  const strengthColor = ['bg-red-300', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pwErrors = validatePassword(formData.password)
    if (pwErrors.length > 0) {
      setError(pwErrors[0])
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid')
      return
    }

    setLoading(true)

    try {
      const response = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          companyName: formData.companyName,
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.message || 'Eroare la înregistrare')
      }
    } catch (err) {
      setError('Nu s-a putut conecta la server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-slate-900">Buildex</h1>
            <p className="text-slate-500 text-sm mt-1">Platformă Achiziții Construcții</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">Creează Cont Nou</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume Companie</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Ex: Construct Pro SRL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume Administrator</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Ex: Ion Popescu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="email@companie.ro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Parolă</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Minim 8 caractere"
              />
              {formData.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Parolă: <span className="font-medium">{strengthLabel}</span></p>
                  <ul className="space-y-0.5">
                    {PASSWORD_RULES.map((rule) => (
                      <li key={rule.key} className={`text-xs flex items-center gap-1.5 ${rule.test(formData.password) ? 'text-green-600' : 'text-slate-400'}`}>
                        <span>{rule.test(formData.password) ? '✓' : '○'}</span>
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmă Parola</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {loading ? 'Se creează contul...' : 'Creează Cont'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Ai deja cont?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Autentifică-te
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
