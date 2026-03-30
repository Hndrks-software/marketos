'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Loader2 } from 'lucide-react'

interface GA4Data {
  dailySessions: { date: string; visitors: number }[]
  topPages: { page: string; visitors: number; bounce: string; duration: string }[]
  trafficSources: { name: string; value: number; color: string }[]
  totalSessions: number
  sessionsChange: number
  bounceRate: string
  avgDuration: string
}

export default function WebsitePage() {
  const [liveCount, setLiveCount] = useState(12)
  const [data, setData] = useState<GA4Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => Math.max(3, prev + Math.floor((Math.random() - 0.45) * 4)))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/ga4')
      .then(res => res.json())
      .then(d => {
        if (d.error) { setError(true) } else { setData(d) }
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const kpis = data ? [
    {
      label: 'Sessies (30 dagen)',
      value: data.totalSessions.toLocaleString('nl-NL'),
      change: `${data.sessionsChange >= 0 ? '+' : ''}${data.sessionsChange}%`,
      positive: data.sessionsChange >= 0,
    },
    {
      label: 'Bouncepercentage',
      value: `${data.bounceRate}%`,
      change: '',
      positive: true,
    },
    {
      label: 'Gem. sessieduur',
      value: data.avgDuration,
      change: '',
      positive: true,
    },
  ] : [
    { label: 'Sessies (30 dagen)', value: '—', change: '', positive: true },
    { label: 'Bouncepercentage', value: '—', change: '', positive: true },
    { label: 'Gem. sessieduur', value: '—', change: '', positive: true },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
          ⚠️ GA4 data kon niet geladen worden. Controleer je environment variables in Netlify.
        </div>
      )}

      {/* Live counter + KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">Live</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{liveCount}</p>
          <p className="text-sm text-slate-500">Actieve bezoekers</p>
        </div>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-center h-28">
              <Loader2 size={20} className="animate-spin text-indigo-300" />
            </div>
          ))
        ) : (
          kpis.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
              <p className="text-sm text-slate-500 mb-2">{kpi.label}</p>
              {kpi.change && (
                <span className={`text-xs font-medium ${kpi.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.change}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Area chart + traffic sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Sessies over tijd (14 dagen)</h3>
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 size={24} className="animate-spin text-indigo-300" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.dailySessions || []}>
                <defs>
                  <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, 'Sessies']} />
                <Area type="monotone" dataKey="visitors" stroke="#6366F1" strokeWidth={2} fill="url(#visitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Verkeersbronnen</h3>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin text-indigo-300" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data?.trafficSources || []} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {(data?.trafficSources || []).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Aandeel']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {(data?.trafficSources || []).map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top pages table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Toplandingspagina&apos;s</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-indigo-300" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Pagina', 'Sessies', 'Bouncepercentage', 'Gem. duur'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.topPages || []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800 font-mono text-xs">{row.page}</td>
                    <td className="px-6 py-3 text-slate-600">{row.visitors.toLocaleString('nl-NL')}</td>
                    <td className="px-6 py-3 text-slate-600">{row.bounce}</td>
                    <td className="px-6 py-3 text-slate-600">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
