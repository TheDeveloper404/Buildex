'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError('')
    try {
      const response = await apiFetch('/api/auth/dev-login', { method: 'POST' })
      if (response.ok) {
        router.push('/dashboard')
      } else {
        setError('Demo mode unavailable')
      }
    } catch {
      setError('Nu s-a putut conecta la server')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.message || 'Eroare la autentificare')
      }
    } catch (err) {
      setError('Nu s-a putut conecta la server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-slate-900">Buildex</h1>
            <p className="text-slate-500 text-sm mt-1">Platformă Achiziții Construcții</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">Autentificare</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="email@companie.ro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Parolă</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {loading ? 'Se autentifică...' : 'Autentificare'}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">sau</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition-colors"
            >
              {demoLoading ? 'Se conectează...' : 'Intră în modul demo'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-slate-500 text-sm">
              Nu ai cont?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                creează cont
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
