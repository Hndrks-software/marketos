'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, LineChart, Line,
} from 'recharts'
import { Loader2, Globe, Monitor, Smartphone, Tablet, Search, TrendingUp } from 'lucide-react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import PageInsight from '@/components/ui/PageInsight'

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

const deviceIcon = { Desktop: Monitor, Mobiel: Smartphone, Tablet: Tablet }

export default function WebsitePage() {
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const [data, setData] = useState<GA4Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  const Skeleton = () => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60 flex items-center justify-center h-32">
      <Loader2 size={20} className="animate-spin text-indigo-300" />
    </div>
  )

  const maxCountry = Math.max(...(data?.topCountries || []).map(c => c.sessions), 1)

  return (
    <div className="space-y-6">
      {/* AI Inzicht */}
      {!loading && !error && <PageInsight page="website" />}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
          ⚠️ GA4 data kon niet geladen worden. Controleer je environment variables in Netlify.
        </div>
      )}

      {/* KPI Rij */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Live bezoekers */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">Live</span>
            </div>
            <InfoTooltip text="Het aantal mensen dat op dit moment actief op je website is. Wordt elke 30 seconden automatisch ververst." />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            {liveCount === null ? '—' : liveCount}
          </p>
          <p className="text-sm text-slate-500">Actieve bezoekers</p>
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-slate-900">{data?.totalSessions.toLocaleString('nl-NL')}</p>
                <InfoTooltip text="Een sessie is één bezoek aan je website. Eén persoon kan meerdere sessies hebben op één dag, bijvoorbeeld als hij na een uur terugkomt." />
              </div>
              <p className="text-sm text-slate-500 mb-2">Sessies (30 dagen)</p>
              <span className={`text-xs font-medium ${(data?.sessionsChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {(data?.sessionsChange || 0) >= 0 ? '+' : ''}{data?.sessionsChange}% vs vorige maand
              </span>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-slate-900">{data?.bounceRate}%</p>
                <InfoTooltip text="Het percentage bezoekers dat je website verlaat na slechts één pagina te hebben bekeken, zonder ergens op te klikken. Lager is beter — het betekent dat mensen meer verkennen." />
              </div>
              <p className="text-sm text-slate-500">Bouncepercentage</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-slate-900">{data?.avgDuration}</p>
                <InfoTooltip text="Hoe lang een bezoeker gemiddeld op je website blijft per bezoek. Langer betekent dat mensen je content interessant vinden. Voor B2B is 2+ minuten een goed teken." />
              </div>
              <p className="text-sm text-slate-500">Gem. sessieduur</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-slate-900">{data?.pagesPerSession}</p>
                <InfoTooltip text="Hoeveel pagina's een bezoeker gemiddeld bekijkt per bezoek. Meer pagina's = meer betrokkenheid. Voor B2B is 2,5+ pagina's per sessie goed." />
              </div>
              <p className="text-sm text-slate-500">Pagina&apos;s per sessie</p>
            </div>
          </>
        )}
      </div>

      {/* Sessies + Verkeersbronnen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Sessies over tijd (14 dagen)</h3>
            <InfoTooltip text="Het aantal bezoeken per dag over de afgelopen 14 dagen. Handig om te zien op welke dagen je het meeste verkeer hebt en of campagnes effect hebben." />
          </div>
          {loading ? <div className="flex items-center justify-center h-56"><Loader2 size={24} className="animate-spin text-indigo-300" /></div> : (
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

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Verkeersbronnen</h3>
            <InfoTooltip text="Hoe bezoekers op je website terechtkomen. Organisch = via Google. Sociaal = via LinkedIn/social media. Direct = URL ingetypt. E-mail = via e-mailcampagne. Betaald = via advertenties." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
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
        {/* Nieuw vs Terugkerend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Nieuw vs Terugkerend</h3>
            <InfoTooltip text="Nieuw = iemand die je website voor het eerst bezoekt. Terugkerend = iemand die al eerder op je site is geweest. Veel terugkerende bezoekers toont loyaliteit en interesse in je merk." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
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

        {/* Apparaattype */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Apparaattype</h3>
            <InfoTooltip text="Via welk apparaat bezoekers je site bekijken. Voor B2B is Desktop vaak dominant omdat mensen vanuit kantoor browsen. Een hoog mobiel percentage kan duiden op brand awareness verkeer." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
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

        {/* Sessiediepte */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Pagina&apos;s per sessie</h3>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs text-slate-400">Hoe diep gaan bezoekers in je site?</p>
            <InfoTooltip text="Het gemiddeld aantal pagina's dat een bezoeker bekijkt per sessie. Een stijgende lijn betekent dat mensen steeds meer pagina's verkennen — een teken dat je content boeit." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data?.sessionDepth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, 'Pagina\'s/sessie']} />
                <Line type="monotone" dataKey="pagesPerSession" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Landen + Zoektermen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top landen */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Top landen</h3>
            <InfoTooltip text="De landen waar je bezoekers vandaan komen. Handig om te zien of je internationale bereik groeit of dat je traffic voornamelijk lokaal is." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
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

        {/* Organische zoektermen */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Organische zoektermen</h3>
            <InfoTooltip text="De zoekwoorden waarmee mensen je website vinden via Google. Handig voor SEO: je ziet precies wat potentiële klanten zoeken. Let op: Google verbergt veel zoektermen om privacyredenen." />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-indigo-300" /></div> : (
            (data?.searchTerms || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <TrendingUp size={24} className="text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Geen zoektermdata beschikbaar</p>
                <p className="text-xs text-slate-300 mt-1">Google maskeert de meeste zoektermen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.searchTerms || []).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate font-medium">{t.term}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                        <div className="h-1 rounded-full" style={{ width: `${Math.round((t.sessions / (data?.searchTerms[0]?.sessions || 1)) * 100)}%`, backgroundColor: '#91B24A' }} />
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">Toplandingspagina&apos;s</h3>
            <InfoTooltip text="De pagina's waar bezoekers het meest op binnenkomen. De eerste pagina die ze zien bepaalt hun eerste indruk. Een hoog bouncepercentage op een pagina betekent dat bezoekers snel weer weggaan." />
          </div>
          <span className="text-xs text-slate-400">30 dagen</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-indigo-300" /></div>
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
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.round((row.visitors / maxVisitors) * 100)}%`, backgroundColor: '#91B24A' }} />
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
    </div>
  )
}
