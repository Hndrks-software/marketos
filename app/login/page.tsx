'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Loader2, TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Ongeldig e-mailadres of wachtwoord.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0F1629' }}>
      {/* Links: branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#91B24A' }}>
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">MarketOS</span>
        </div>

        <div>
          <p className="text-4xl font-bold text-white leading-tight mb-4">
            Jouw marketing data,<br />
            <span style={{ color: '#91B24A' }}>op één plek.</span>
          </p>
          <p className="text-slate-400 text-lg">
            LinkedIn analytics, contentplanning, CRM en AI-advies — allemaal in één professioneel platform.
          </p>
        </div>

        <div className="flex gap-8">
          {[
            { label: 'LinkedIn bereik', value: 'Live' },
            { label: 'Leads bijhouden', value: 'CRM' },
            { label: 'AI adviseur', value: '24/7' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rechts: login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Logo op mobiel */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#91B24A' }}>
                <TrendingUp size={14} className="text-white" />
              </div>
              <span className="font-bold text-slate-900">MarketOS</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welkom terug</h1>
            <p className="text-slate-500 text-sm mb-8">Log in op je MarketOS account</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jij@bedrijf.nl"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#91B24A' }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Inloggen...</> : 'Inloggen'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
