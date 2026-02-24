'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDevLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to login. Make sure seed data exists.')
      }
    } catch (err) {
      setError('Network error. Make sure API is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center">
            <span className="text-blue-400 text-2xl">🔐</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3 text-center">
          Acces Demo
        </h1>
        <p className="text-slate-400 mb-8 text-center text-sm leading-relaxed">
          Mod demonstrativ care permite accesul fără autentificare.
          Datele sunt pre-populate cu materiale și furnizori din piața românească.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleDevLogin}
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
        >
          {loading ? 'Se conectează...' : 'Intră în mediul Demo'}
        </button>

        <p className="mt-5 text-xs text-slate-500 text-center leading-relaxed">
          Se creează o sesiune cu date demonstrative.
          În producție, acest endpoint este dezactivat.
        </p>
      </div>
    </div>
  )
}
