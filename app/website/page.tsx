'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, LineChart, Line,
} from 'recharts'
import {
  Loader2, Globe, Monitor, Smartphone, Tablet, Search,
  TrendingUp, TrendingDown, Zap, ArrowUpRight, Target,
} from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import PageInsight from '@/components/ui/PageInsight'
import { cn } from '@/lib/utils'

interface GA4Data {
  dailySessions: { date: string; visitors: number }[]
  topPages: { page: string; visitors: number; bounce: string; duration: string }[]
  trafficSources: { name: string; value: number; color: string }[]
  totalSessions: number
  sessionsChange: number
  bounceRate: string
  avgDuration: string
  pagesPerSession: string
  newVsReturning: { name: string; value: number; color: string }[]
  deviceBreakdown: { name: string; value: number; color: string }[]
  topCountries: { country: string; sessions: number }[]
  searchTerms: { term: string; sessions: number }[]
  sessionDepth: { date: string; pagesPerSession: string }[]
}

interface SCData {
  totalClicks: number
  totalImpressions: number
  avgCtr: number
  avgPosition: number
  keywords: { query: string; clicks: number; impressions: number; ctr: number; position: number }[]
  quickWins: { query: string; clicks: number; impressions: number; ctr: number; position: number }[]
  pages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[]
  weeklyTrend: { week: string; clicks: number; impressions: number }[]
  devices: { device: string; clicks: number; impressions: number }[]
  period: string
}

const deviceIcon = { Desktop: Monitor, Mobiel: Smartphone, Tablet: Tablet }

type Tab = 'overzicht' | 'seo'

export default function WebsitePage() {
  const [tab, setTab] = useState<Tab>('overzicht')
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const [data, setData] = useState<GA4Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // SEO state
  const [scData, setScData] = useState<SCData | null>(null)
  const [scLoading, setScLoading] = useState(false)
  const [scError, setScError] = useState('')

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch('/api/ga4/realtime')
      const d = await res.json()
      setLiveCount(d.activeUsers ?? 0)
    } catch {
      setLiveCount(null)
    }
  }, [])

  useEffect(() => {
    fetch('/api/ga4')
      .then(res => res.json())
      .then(d => { if (d.error) setError(true); else setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })

    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  // Laad SEO data wanneer SEO tab geopend wordt
  useEffect(() => {
    if (tab === 'seo' && !scData && !scLoading) {
      setScLoading(true)
      fetch('/api/search-console')
        .then(res => res.json())
        .then(d => {
          if (d.error) setScError(d.error)
          else setScData(d)
          setScLoading(false)
        })
        .catch(() => { setScError('Kon SEO data niet laden'); setScLoading(false) })
    }
  }, [tab, scData, scLoading])

  const Skeleton = () => (
    <div className="bg-white rounded-xl p-5 border border-slate-200/60 flex items-center justify-center h-32">
      <Loader2 size={20} className="animate-spin text-slate-300" />
    </div>
  )

  const positionColor = (pos: number) => {
    if (pos <= 3) return 'text-emerald-600 bg-emerald-50'
    if (pos <= 10) return 'text-amber-600 bg-amber-50'
    return 'text-slate-500 bg-slate-100'
  }

  const positionIcon = (pos: number) => {
    if (pos <= 3) return <TrendingUp size={12} />
    if (pos <= 10) return <Target size={12} />
    return <TrendingDown size={12} />
  }

  return (
    <div className="space-y-6">
      {/* Tab navigatie */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('overzicht')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
            tab === 'overzicht' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Globe size={15} />
          Overzicht
        </button>
        <button
          onClick={() => setTab('seo')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
            tab === 'seo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Search size={15} />
          SEO
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-light text-brand font-semibold">Nieuw</span>
        </button>
      </div>

      {/* ── OVERZICHT TAB ─────────────────────────────────────── */}
      {tab === 'overzicht' && (
        <>
          {/* AI Inzicht */}
          {!loading && !error && <PageInsight page="website" />}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
              ⚠️ GA4 data kon niet geladen worden. Controleer je environment variables in Netlify.
            </div>
          )}

          {/* KPI Rij */}
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">Live</span>
                </div>
                <InfoTooltip text="Het aantal mensen dat op dit moment actief op je website is. Wordt elke 30 seconden automatisch ververst." />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{liveCount === null ? '—' : liveCount}</p>
              <p className="text-sm text-slate-500">Actieve bezoekers</p>
            </div>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            ) : (
              <>
                <div className="bg-white rounded-xl p-5 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-2xl font-bold text-slate-900">{data?.totalSessions.toLocaleString('nl-NL')}</p>
                    <InfoTooltip text="Een sessie is één bezoek aan je website." />
                  </div>
                  <p className="text-sm text-slate-500 mb-2">Sessies (30 dagen)</p>
                  <span className={`text-xs font-medium ${(data?.sessionsChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {(data?.sessionsChange || 0) >= 0 ? '+' : ''}{data?.sessionsChange}% vs vorige maand
                  </span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-2xl font-bold text-slate-900">{data?.bounceRate}%</p>
                    <InfoTooltip text="Het percentage bezoekers dat je website verlaat na slechts één pagina. Lager is beter." />
                  </div>
                  <p className="text-sm text-slate-500">Bouncepercentage</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-2xl font-bold text-slate-900">{data?.avgDuration}</p>
                    <InfoTooltip text="Hoe lang een bezoeker gemiddeld op je website blijft. Voor B2B is 2+ minuten goed." />
                  </div>
                  <p className="text-sm text-slate-500">Gem. sessieduur</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-2xl font-bold text-slate-900">{data?.pagesPerSession}</p>
                    <InfoTooltip text="Hoeveel pagina's een bezoeker gemiddeld bekijkt per bezoek." />
                  </div>
                  <p className="text-sm text-slate-500">Pagina&apos;s per sessie</p>
                </div>
              </>
            )}
          </div>

          {/* Sessies + Verkeersbronnen */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Sessies over tijd (14 dagen)</h3>
                <InfoTooltip text="Het aantal bezoeken per dag over de afgelopen 14 dagen." />
              </div>
              {loading ? <div className="flex items-center justify-center h-56"><Loader2 size={24} className="animate-spin text-slate-300" /></div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data?.dailySessions || []}>
                    <defs>
                      <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#91B24A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#91B24A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, 'Sessies']} />
                    <Area type="monotone" dataKey="visitors" stroke="#91B24A" strokeWidth={2} fill="url(#visitGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Verkeersbronnen</h3>
                <InfoTooltip text="Hoe bezoekers op je website terechtkomen. Organisch = via Google. Sociaal = via LinkedIn." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={data?.trafficSources || []} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {(data?.trafficSources || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, 'Aandeel']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {(data?.trafficSources || []).map(s => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
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

          {/* Nieuw vs Terugkerend + Apparaat + Sessiediepte */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Nieuw vs Terugkerend</h3>
                <InfoTooltip text="Nieuw = eerste bezoek. Terugkerend = al eerder op je site geweest." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={data?.newVsReturning || []} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {(data?.newVsReturning || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {(data?.newVsReturning || []).map(s => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-slate-600">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Apparaattype</h3>
                <InfoTooltip text="Via welk apparaat bezoekers je site bekijken. Voor B2B is Desktop dominant." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                <div className="space-y-4 mt-2">
                  {(data?.deviceBreakdown || []).map(d => {
                    const Icon = deviceIcon[d.name as keyof typeof deviceIcon] || Monitor
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-700">{d.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{d.value}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${d.value}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Pagina&apos;s per sessie</h3>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-slate-400">Hoe diep gaan bezoekers in je site?</p>
                <InfoTooltip text="Stijgende lijn = mensen verkennen meer pagina's." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data?.sessionDepth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, "Pagina's/sessie"]} />
                    <Line type="monotone" dataKey="pagesPerSession" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Landen + Zoektermen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-900 text-sm">Top landen</h3>
                <InfoTooltip text="De landen waar je bezoekers vandaan komen." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.topCountries || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="country" type="category" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, 'Sessies']} />
                    <Bar dataKey="sessions" fill="#91B24A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <Search size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-900 text-sm">Organische zoektermen</h3>
                <InfoTooltip text="Zoekwoorden via Google. Voor meer detail: ga naar de SEO tab." />
              </div>
              {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-slate-300" /></div> : (
                (data?.searchTerms || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                    <Search size={24} className="text-slate-200" />
                    <p className="text-sm text-slate-400">Bekijk de SEO tab voor zoekwoorddata</p>
                    <button onClick={() => setTab('seo')} className="text-xs font-medium text-brand hover:text-brand-dark transition-colors">
                      Ga naar SEO →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(data?.searchTerms || []).map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate font-medium">{t.term}</p>
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                            <div className="h-1 rounded-full bg-brand" style={{ width: `${Math.round((t.sessions / (data?.searchTerms[0]?.sessions || 1)) * 100)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 shrink-0">{t.sessions}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Top pagina's */}
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">Toplandingspagina&apos;s</h3>
                <InfoTooltip text="De pagina's waar bezoekers het meest op binnenkomen." />
              </div>
              <span className="text-xs text-slate-400">30 dagen</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Pagina', 'Sessies', 'Bouncepercentage', 'Gem. duur', 'Populariteit'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(data?.topPages || []).map((row, i) => {
                      const maxVisitors = Math.max(...(data?.topPages || []).map(p => p.visitors), 1)
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800 font-mono text-xs">{row.page}</td>
                          <td className="px-6 py-3 text-slate-600">{row.visitors.toLocaleString('nl-NL')}</td>
                          <td className="px-6 py-3 text-slate-600">{row.bounce}</td>
                          <td className="px-6 py-3 text-slate-600">{row.duration}</td>
                          <td className="px-6 py-3 w-32">
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.round((row.visitors / maxVisitors) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── SEO TAB ───────────────────────────────────────────── */}
      {tab === 'seo' && (
        <>
          {scLoading && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          )}

          {scError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-medium">Google Search Console kon niet geladen worden</p>
                <p className="text-xs mt-1 text-amber-600">{scError}</p>
                <p className="text-xs mt-2 text-amber-600">Zorg dat: 1) <code className="bg-amber-100 px-1 rounded">SEARCH_CONSOLE_SITE_URL</code> is ingesteld in Netlify, 2) je service account toegang heeft tot Search Console.</p>
              </div>
            </div>
          )}

          {scData && (
            <>
              {/* KPI rij */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Totaal klikken',
                    value: scData.totalClicks.toLocaleString('nl-NL'),
                    sub: 'afgelopen 90 dagen',
                    tooltip: 'Hoe vaak mensen op jouw website hebben geklikt vanuit Google zoekresultaten.',
                    color: '#91B24A',
                  },
                  {
                    label: 'Impressies',
                    value: scData.totalImpressions.toLocaleString('nl-NL'),
                    sub: 'weergaven in Google',
                    tooltip: 'Hoe vaak jouw website is getoond in Google zoekresultaten, ook als er niet op geklikt is.',
                    color: '#8B5CF6',
                  },
                  {
                    label: 'Gem. CTR',
                    value: `${scData.avgCtr}%`,
                    sub: 'klikratio',
                    tooltip: 'Het percentage van mensen dat klikt als jouw site verschijnt in Google. Boven 3% is goed voor B2B.',
                    color: '#3B82F6',
                  },
                  {
                    label: 'Gem. positie',
                    value: `#${scData.avgPosition}`,
                    sub: 'in Google resultaten',
                    tooltip: 'Op welke positie je gemiddeld verschijnt in Google. Onder de 10 betekent pagina 1. Lager getal = beter.',
                    color: '#F59E0B',
                  },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-xl p-5 border border-slate-200/60">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                        <Search size={14} style={{ color: kpi.color }} />
                      </div>
                      <InfoTooltip text={kpi.tooltip} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Quick Wins + Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Quick Wins */}
                {scData.quickWins.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200/60">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Zap size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Quick Wins 🎯</h3>
                        <p className="text-xs text-slate-500">Bijna op pagina 1 van Google</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {scData.quickWins.map((kw, i) => (
                        <div key={i} className="bg-white/70 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{kw.query}</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">#{kw.position}</span>
                          </div>
                          <p className="text-xs text-slate-500">{kw.impressions} impressies · {kw.ctr}% CTR</p>
                          <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                            <ArrowUpRight size={11} /> Nog {Math.ceil(kw.position - 1)} posities naar top 3
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Klikken trend */}
                <div className={cn("bg-white rounded-xl p-5 border border-slate-200/60", scData.quickWins.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-slate-900 text-sm">Klikken & impressies over tijd</h3>
                    <InfoTooltip text="Hoe je organisch Google verkeer zich ontwikkelt over de laatste 90 dagen. Een stijgende lijn = betere SEO resultaten." />
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={scData.weeklyTrend}>
                      <defs>
                        <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#91B24A" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#91B24A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="impGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                      <Area type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#impGrad2)" name="Impressies" />
                      <Area type="monotone" dataKey="clicks" stroke="#91B24A" strokeWidth={2} fill="url(#clickGrad)" name="Klikken" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Zoekwoorden tabel */}
              <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm">Top zoekwoorden</h3>
                    <InfoTooltip text="De zoekwoorden waarvoor jouw website verschijnt in Google. Klikken = echte bezoekers, impressies = hoe vaak je zichtbaar was. CTR = klikratio. Positie = gemiddelde ranking." />
                  </div>
                  <span className="text-xs text-slate-400">{scData.period}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Zoekwoord', 'Klikken', 'Impressies', 'CTR', 'Positie'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {scData.keywords.map((kw, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">{kw.query}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700 font-medium">{kw.clicks}</span>
                              <div className="w-16 bg-slate-100 rounded-full h-1">
                                <div className="h-1 rounded-full bg-brand" style={{ width: `${Math.round((kw.clicks / (scData.keywords[0]?.clicks || 1)) * 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-600">{kw.impressions.toLocaleString('nl-NL')}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${kw.ctr >= 5 ? 'text-emerald-600 bg-emerald-50' : kw.ctr >= 2 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}>
                              {kw.ctr}%
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${positionColor(kw.position)}`}>
                              {positionIcon(kw.position)}
                              #{kw.position}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagina ranking */}
              <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm">Pagina ranking in Google</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Welke pagina&apos;s van je website scoren het best in Google</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Pagina', 'Klikken', 'Impressies', 'CTR', 'Gem. positie'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {scData.pages.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-slate-700 font-medium">{p.page}</td>
                          <td className="px-6 py-3 text-slate-700 font-medium">{p.clicks}</td>
                          <td className="px-6 py-3 text-slate-600">{p.impressions.toLocaleString('nl-NL')}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.ctr >= 5 ? 'text-emerald-600 bg-emerald-50' : p.ctr >= 2 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}>
                              {p.ctr}%
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${positionColor(p.position)}`}>
                              {positionIcon(p.position)}
                              #{p.position}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
