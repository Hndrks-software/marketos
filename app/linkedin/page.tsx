'use client'

import { useState, useEffect, useRef } from 'react'
import { CloudUpload, CheckCircle, AlertCircle, Loader2, Upload, Users, Eye, TrendingUp, MousePointerClick } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'
import { supabase, LinkedInAnalytics, LinkedInPost } from '@/lib/supabase'
import InfoTooltip from '@/components/ui/InfoTooltip'
import PageInsight from '@/components/ui/PageInsight'

export default function LinkedInPage() {
  const [data, setData] = useState<LinkedInAnalytics[]>([])
  const [posts, setPosts] = useState<LinkedInPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadDetail, setUploadDetail] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [analyticsRes, postsRes] = await Promise.all([
      supabase.from('linkedin_analytics').select('*').order('date', { ascending: true }),
      supabase.from('linkedin_posts').select('*').order('published_date', { ascending: false }),
    ])
    setData((analyticsRes.data || []) as LinkedInAnalytics[])
    setPosts((postsRes.data || []) as LinkedInPost[])
    setLoading(false)
  }

  const handleUpload = async (file: File) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      setUploadStatus('error')
      setUploadMessage('Alleen .xls of .xlsx bestanden worden geaccepteerd')
      setUploadDetail('Download het bestand direct van LinkedIn — geen extra bewerking nodig')
      return
    }

    setUploadStatus('loading')
    setUploadMessage('Bestand inlezen...')
    setUploadDetail('')

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      function parseDate(raw: string): string | null {
        if (!raw || typeof raw !== 'string') return null
        const parts = raw.trim().split('/')
        if (parts.length !== 3) return null
        const [month, day, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      function num(val: unknown): number {
        const n = parseFloat(String(val ?? 0))
        return isNaN(n) ? 0 : n
      }

      type ImportRow = { date: string; [key: string]: number | string | null | undefined }
      let rows: ImportRow[] = []
      let fileType = 'onbekend'

      if (name.includes('content')) {
        const sheet = workbook.Sheets['Statistieken']
        if (!sheet) throw new Error('Sheet "Statistieken" niet gevonden in content bestand')
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = raw.slice(2).map(r => {
          const date = parseDate(r[0])
          if (!date) return null
          return {
            date,
            impressions: Math.round(num(r[3])),
            clicks: Math.round(num(r[7])),
            reactions: Math.round(num(r[10])),
            comments: Math.round(num(r[13])),
            shares: Math.round(num(r[16])),
            engagement_rate: Math.round(num(r[19]) * 100) / 100,
          }
        }).filter(Boolean) as ImportRow[]
        fileType = 'content'

        // Ook per-post data importeren uit "Alle bijdragen" sheet
        const postsSheet = workbook.Sheets['Alle bijdragen']
        if (postsSheet) {
          const postsRaw = XLSX.utils.sheet_to_json<string[]>(postsSheet, { header: 1, defval: '' }) as string[][]
          type PostImportRow = { [key: string]: string | number | null | undefined }
          const postRows: PostImportRow[] = postsRaw.slice(2).map(r => {
            const date = parseDate(r[5])
            if (!date || !r[1]) return null
            return {
              post_url: String(r[1]).trim(),
              post_title: String(r[0]).slice(0, 280),
              post_type: String(r[2]) || 'Spontaan',
              content_type: String(r[19]) || null,
              published_date: date,
              audience: String(r[8]) || null,
              views: Math.round(num(r[9])),
              unique_views: Math.round(num(r[10])),
              clicks: Math.round(num(r[12])),
              ctr: Math.round(num(r[13]) * 10000) / 10000,
              reactions: Math.round(num(r[14])),
              comments: Math.round(num(r[15])),
              reposts: Math.round(num(r[16])),
              follows: Math.round(num(r[17])),
              engagement_rate: Math.round(num(r[18]) * 10000) / 10000,
            }
          }).filter(Boolean) as PostImportRow[]

          if (postRows.length > 0) {
            await fetch('/api/linkedin-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rows: postRows, fileType: 'content-posts' }),
            })
          }
        }
      } else if (name.includes('followers')) {
        const sheet = workbook.Sheets['Nieuwe volgers']
        if (!sheet) throw new Error('Sheet "Nieuwe volgers" niet gevonden')
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = raw.slice(1).map(r => {
          const date = parseDate(r[0])
          if (!date) return null
          return { date, new_followers: Math.round(num(r[2])), total_followers: Math.round(num(r[4])) }
        }).filter(Boolean) as ImportRow[]
        fileType = 'followers'
      } else if (name.includes('visitors')) {
        const sheet = workbook.Sheets['Statistieken over bezoekers']
        if (!sheet) throw new Error('Sheet "Statistieken over bezoekers" niet gevonden')
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = raw.slice(1).map(r => {
          const date = parseDate(r[0])
          if (!date) return null
          return { date, page_views: Math.round(num(r[21])), unique_visitors: Math.round(num(r[24])) }
        }).filter(Boolean) as ImportRow[]
        fileType = 'visitors'
      } else {
        throw new Error('Bestandsnaam niet herkend. Zorg dat de naam "content", "followers" of "visitors" bevat.')
      }

      const validRows = rows.filter(r => {
        const vals = Object.entries(r).filter(([k]) => k !== 'date').map(([, v]) => v as number)
        return vals.some(v => v > 0)
      })

      if (validRows.length === 0) throw new Error('Geen geldige data gevonden in het bestand')

      setUploadMessage('Opslaan in database...')

      const res = await fetch('/api/linkedin-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows, fileType }),
      })
      const json = await res.json()

      if (json.success) {
        const typeLabel: Record<string, string> = { content: 'Content statistieken', followers: 'Volgers', visitors: 'Bezoekers' }
        setUploadStatus('success')
        setUploadMessage(`✓ ${json.rowsImported} dagen geïmporteerd (${typeLabel[json.fileType] || json.fileType})`)
        setUploadDetail(`Periode: ${json.dateRange.from} t/m ${json.dateRange.to}`)
        await loadData()
      } else {
        setUploadStatus('error')
        setUploadMessage(json.error || 'Upload mislukt')
        setUploadDetail('')
      }
    } catch (err) {
      setUploadStatus('error')
      setUploadMessage(err instanceof Error ? err.message : 'Upload mislukt — probeer opnieuw')
      setUploadDetail('')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const last30 = data.slice(-30)
  const totalImpressions = data.reduce((s, d) => s + (d.impressions || 0), 0)
  const totalReactions = data.reduce((s, d) => s + (d.reactions || 0), 0)
  const totalClicks = data.reduce((s, d) => s + (d.clicks || 0), 0)
  const latestFollowers = [...data].reverse().find(d => (d.total_followers || 0) > 0)?.total_followers || 0
  const avgEngagementRate = data.length
    ? (data.reduce((s, d) => s + (d.engagement_rate || 0), 0) / data.filter(d => d.engagement_rate).length * 100).toFixed(1)
    : '0'
  const top10 = [...data].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10)

  return (
    <div className="space-y-6">

      {/* AI Inzicht */}
      {data.length > 0 && <PageInsight page="linkedin" />}

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging ? 'border-indigo-300 bg-brand-light' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white'
        }`}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => uploadStatus !== 'loading' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        {uploadStatus === 'loading' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{uploadMessage}</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={32} className="text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-600">{uploadMessage}</p>
            {uploadDetail && <p className="text-xs text-slate-400">{uploadDetail}</p>}
            <p className="text-xs text-slate-400 mt-1">Klik om nog een bestand te uploaden</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm font-semibold text-red-500">{uploadMessage}</p>
            {uploadDetail && <p className="text-xs text-slate-400">{uploadDetail}</p>}
            <p className="text-xs text-slate-400 mt-1">Klik om opnieuw te proberen</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center">
              <Upload size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Sleep je LinkedIn exportbestand hier</p>
              <p className="text-xs text-slate-400 mt-0.5">of klik om te bladeren · .xls of .xlsx</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-1">
              {['content_...xls', 'followers_...xls', 'visitors_...xls'].map(f => (
                <span key={f} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
            <p className="text-xs text-slate-400">Overlappende data wordt automatisch overschreven</p>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            icon: <Eye size={16} className="text-brand" />,
            label: 'Totaal impressies',
            value: loading ? '...' : totalImpressions.toLocaleString('nl-NL'),
            tooltip: 'Het totale aantal keer dat jouw LinkedIn posts zijn weergegeven in de feed van iemand. Hoge impressies betekenen een groot bereik.'
          },
          {
            icon: <MousePointerClick size={16} className="text-brand" />,
            label: 'Totaal klikken',
            value: loading ? '...' : totalClicks.toLocaleString('nl-NL'),
            tooltip: 'Hoe vaak mensen op je posts hebben geklikt — op de link, het bedrijfslogo of om de post uit te vouwen. Klikken tonen echte interesse.'
          },
          {
            icon: <TrendingUp size={16} className="text-brand" />,
            label: 'Gem. engagement rate',
            value: loading ? '...' : `${avgEngagementRate}%`,
            tooltip: 'Het percentage van je bereik dat actief heeft gereageerd (reacties + klikken + comments + shares). Boven 2% is goed voor B2B LinkedIn.'
          },
          {
            icon: <Users size={16} className="text-brand" />,
            label: 'Totaal volgers',
            value: loading ? '...' : latestFollowers > 0 ? latestFollowers.toLocaleString('nl-NL') : data.length > 0 ? 'Upload followers' : '—',
            tooltip: 'Het totale aantal volgers van je LinkedIn bedrijfspagina. Upload het "followers" exportbestand voor de meest actuele cijfers.'
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">{kpi.icon}</div>
              <InfoTooltip text={kpi.tooltip} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
            <p className="text-xs text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-indigo-300" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-48 gap-3">
          <CloudUpload size={32} className="text-slate-300" />
          <div className="text-center">
            <p className="text-slate-500 text-sm font-medium">Nog geen LinkedIn data</p>
            <p className="text-slate-400 text-xs mt-1">Upload je eerste exportbestand via het vak hierboven</p>
          </div>
        </div>
      ) : (
        <>
          {/* Impressies + Engagement */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Impressies over tijd (laatste 30 dagen)</h3>
                <InfoTooltip text="Het dagelijks bereik van je LinkedIn posts. Pieken zijn vaak nieuwe posts of posts die viral gaan. Een stabiele lijn betekent consistent posten." />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={last30}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#91B24A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#91B24A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [Number(v).toLocaleString('nl-NL'), 'Impressies']} />
                  <Area type="monotone" dataKey="impressions" stroke="#91B24A" strokeWidth={2} fill="url(#impGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Engagement totalen</h3>
                <InfoTooltip text="De totale som van alle interacties over de gehele periode. Reacties tonen emotionele betrokkenheid, shares vergroten je bereik, comments starten gesprekken." />
              </div>
              <div className="space-y-4 mt-2">
                {[
                  { label: 'Reacties', value: totalReactions, color: '#91B24A' },
                  { label: 'Klikken', value: totalClicks, color: '#8B5CF6' },
                  { label: 'Comments', value: data.reduce((s, d) => s + (d.comments || 0), 0), color: '#10B981' },
                  { label: 'Shares', value: data.reduce((s, d) => s + (d.shares || 0), 0), color: '#F59E0B' },
                ].map(item => {
                  const max = Math.max(totalReactions, totalClicks, data.reduce((s, d) => s + (d.comments || 0), 0), data.reduce((s, d) => s + (d.shares || 0), 0), 1)
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-700">{item.label}</span>
                        <span className="text-sm font-semibold text-slate-800">{item.value.toLocaleString('nl-NL')}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.round((item.value / max) * 100)}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Engagement chart + Volgers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Dagelijkse engagement (laatste 30 dagen)</h3>
                <InfoTooltip text="Hoe actief je publiek dagelijks reageert op je posts. Hoge pieken zijn vaak reacties op een succesvolle post. Een constante lijn toont een betrokken vaste doelgroep." />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Bar dataKey="reactions" stackId="a" fill="#91B24A" name="Reacties" />
                  <Bar dataKey="comments" stackId="a" fill="#8B5CF6" name="Comments" />
                  <Bar dataKey="shares" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Nieuwe volgers per dag (laatste 30 dagen)</h3>
                <InfoTooltip text="Hoeveel nieuwe mensen je pagina dagelijks gaan volgen. Pieken zijn vaak gekoppeld aan een virale post of actieve campagne. Upload het 'followers' bestand voor deze data." />
              </div>
              {last30.some(d => (d.new_followers || 0) > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={last30}>
                    <defs>
                      <linearGradient id="follGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} formatter={(v) => [v, 'Nieuwe volgers']} />
                    <Area type="monotone" dataKey="new_followers" stroke="#10B981" strokeWidth={2} fill="url(#follGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Users size={28} className="text-slate-200" />
                  <p className="text-sm text-slate-400 text-center">Upload het <span className="font-medium text-slate-500">followers</span> exportbestand<br />voor volgers-data</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 10 tabel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">Top 10 — Beste dagen op bereik</h3>
                <InfoTooltip text="De 10 dagen waarop je posts het meeste bereik hadden. Gebruik dit om te zien op welke dag/moment je posts het best presteren en stem je contentkalender daarop af." />
              </div>
              <span className="text-xs text-slate-400">Alle data</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Datum', 'Impressies', 'Klikken', 'Reacties', 'Comments', 'Shares', 'Eng. Rate'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {top10.map((row, i) => {
                    const reactions = row.reactions || 0
                    const comments = row.comments || 0
                    const shares = row.shares || 0
                    const impressions = row.impressions || 0
                    const engRate = row.engagement_rate != null
                      ? (row.engagement_rate * 100).toFixed(2)
                      : impressions > 0
                        ? (((reactions + comments + shares) / impressions) * 100).toFixed(2)
                        : '0'
                    return (
                      <tr key={row.id || i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{row.date}</td>
                        <td className="px-6 py-3 text-slate-600">{impressions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{(row.clicks || 0).toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{reactions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{comments.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{shares.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-medium text-brand bg-brand-light px-2 py-0.5 rounded-full">{engRate}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-post analyse */}
          {posts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">Posts — individuele prestaties</h3>
                  <InfoTooltip text="Elk LinkedIn-bericht apart, gesorteerd op bereik. Zo zie je precies welke posts het best scoren en welk type content (video, tekst, afbeelding) het meest aanslaat bij jouw doelgroep." />
                </div>
                <span className="text-xs text-slate-400">{posts.length} posts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Post', 'Type', 'Datum', 'Bereik', 'Klikken', 'Reacties', 'Eng. Rate'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 20).map((post, i) => {
                      const engPct = post.engagement_rate ? (post.engagement_rate * 100).toFixed(1) : '—'
                      const maxViews = Math.max(...posts.map(p => p.views || 0), 1)
                      const barWidth = Math.round(((post.views || 0) / maxViews) * 100)
                      const typeColors: Record<string, string> = {
                        'Video': 'text-violet-600 bg-violet-50',
                        '': 'text-slate-500 bg-slate-100',
                      }
                      const typeStyle = typeColors[post.content_type || ''] || 'text-brand bg-brand-light'
                      return (
                        <tr key={post.id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex flex-col gap-1">
                              <p className="text-slate-700 text-xs font-medium line-clamp-2 leading-relaxed">
                                {post.post_title?.slice(0, 100) || '—'}
                              </p>
                              <div className="w-full bg-slate-100 rounded-full h-1">
                                <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {post.content_type ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle}`}>
                                {post.content_type}
                              </span>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{post.published_date}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{(post.views || 0).toLocaleString('nl-NL')}</td>
                          <td className="px-4 py-3 text-slate-600">{(post.clicks || 0).toLocaleString('nl-NL')}</td>
                          <td className="px-4 py-3 text-slate-600">{(post.reactions || 0).toLocaleString('nl-NL')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              parseFloat(engPct) >= 5 ? 'text-emerald-600 bg-emerald-50' :
                              parseFloat(engPct) >= 2 ? 'text-amber-600 bg-amber-50' :
                              'text-slate-500 bg-slate-100'
                            }`}>{engPct}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
