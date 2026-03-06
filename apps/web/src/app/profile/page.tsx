'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/nav'
import { apiFetch } from '@/lib/api'
import { PASSWORD_RULES, validatePassword, passwordStrength } from '@buildex/shared'

interface UserProfile {
  id: string
  tenantId: string
  email: string
  name: string
  role: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Name edit
  const [name, setName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  const strength = passwordStrength(newPassword)
  const strengthLabel = ['Foarte slabă', 'Slabă', 'Medie', 'Bună', 'Puternică'][strength]
  const strengthColor = ['bg-red-300', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength]

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await apiFetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setName(data.name)
      }
    } catch {
      // handled by route effects
    } finally {
      setLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError('')
    setNameSuccess('')

    if (!name.trim()) {
      setNameError('Numele este obligatoriu')
      return
    }

    setNameLoading(true)
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setName(data.name)
        setNameSuccess('Numele a fost actualizat cu succes')
        setTimeout(() => setNameSuccess(''), 3000)
      } else {
        const data = await res.json()
        setNameError(data.message || 'Eroare la actualizarea numelui')
      }
    } catch {
      setNameError('Nu s-a putut conecta la server')
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    const pwErrors = validatePassword(newPassword)
    if (pwErrors.length > 0) {
      setPwError(pwErrors[0])
      return
    }

    if (newPassword !== confirmPassword) {
      setPwError('Parolele nu coincid')
      return
    }

    setPwLoading(true)
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        setPwSuccess('Parola a fost schimbată cu succes')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPwSuccess(''), 3000)
      } else {
        const data = await res.json()
        setPwError(data.message || 'Eroare la schimbarea parolei')
      }
    } catch {
      setPwError('Nu s-a putut conecta la server')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Profilul Meu</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Account Info (read-only) */}
            <section className="bg-white rounded-2xl shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Informații Cont</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Rol</p>
                  <p className="text-sm font-medium text-slate-900 capitalize">{user?.role}</p>
                </div>
              </div>
            </section>

            {/* Edit Name */}
            <section className="bg-white rounded-2xl shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Editare Nume</h2>

              {nameSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {nameSuccess}
                </div>
              )}
              {nameError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {nameError}
                </div>
              )}

              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ex: Ion Popescu"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={nameLoading || name.trim() === user?.name}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    {nameLoading ? 'Se salvează...' : 'Salvează Numele'}
                  </button>
                </div>
              </form>
            </section>

            {/* Change Password */}
            <section className="bg-white rounded-2xl shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Schimbare Parolă</h2>

              {pwSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {pwSuccess}
                </div>
              )}
              {pwError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {pwError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Parola Curentă</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Parola Nouă</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Minim 8 caractere"
                  />
                  {newPassword.length > 0 && (
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
                          <li key={rule.key} className={`text-xs flex items-center gap-1.5 ${rule.test(newPassword) ? 'text-green-600' : 'text-slate-400'}`}>
                            <span>{rule.test(newPassword) ? '✓' : '○'}</span>
                            {rule.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmă Parola Nouă</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    {pwLoading ? 'Se schimbă...' : 'Schimbă Parola'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
