'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, BarChart3, Users, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen flex gradient-hero">
      {/* Links: branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-3">
          <Image
            src="/collox-logo.png"
            alt="Collo-X by FarmaSort"
            width={160}
            height={48}
            className="object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
            priority
          />
        </div>

        <div>
          <p className="text-4xl font-bold text-white leading-tight mb-4">
            Jouw marketing data,<br />
            <span className="text-brand">op één plek.</span>
          </p>
          <p className="text-slate-400 text-lg max-w-md">
            LinkedIn analytics, contentplanning, CRM en AI-advies — allemaal in één professioneel platform.
          </p>
        </div>

        <div className="flex gap-8">
          {[
            { label: 'LinkedIn bereik', value: 'Live', icon: BarChart3 },
            { label: 'Leads bijhouden', value: 'CRM', icon: Users },
            { label: 'AI adviseur', value: '24/7', icon: Sparkles },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <stat.icon size={18} className="text-brand" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rechts: login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8">
            {/* Logo op mobiel */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <Image
                src="/collox-logo.png"
                alt="Collo-X"
                width={120}
                height={36}
                className="object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welkom terug</h1>
            <p className="text-slate-400 text-sm mb-8">Log in op je MarketOS account</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jij@bedrijf.nl"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
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
                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg gradient-brand transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-brand/25"
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
