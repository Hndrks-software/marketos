'use client'

import { useState, useEffect, useRef } from 'react'
import { CloudUpload, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { supabase, LinkedInAnalytics } from '@/lib/supabase'

export default function LinkedInPage() {
  const [data, setData] = useState<LinkedInAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadDetail, setUploadDetail] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: rows } = await supabase
      .from('linkedin_analytics')
      .select('*')
      .order('date', { ascending: true })
    setData((rows || []) as LinkedInAnalytics[])
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
      // Dynamisch laden van xlsx in de browser (niet server-side)
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

      } else if (name.includes('followers')) {
        const sheet = workbook.Sheets['Nieuwe volgers']
        if (!sheet) throw new Error('Sheet "Nieuwe volgers" niet gevonden')
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = raw.slice(1).map(r => {
          const date = parseDate(r[0])
          if (!date) return null
          return {
            date,
            new_followers: Math.round(num(r[2])),
            total_followers: Math.round(num(r[4])),
          }
        }).filter(Boolean) as ImportRow[]
        fileType = 'followers'

      } else if (name.includes('visitors')) {
        const sheet = workbook.Sheets['Statistieken over bezoekers']
        if (!sheet) throw new Error('Sheet "Statistieken over bezoekers" niet gevonden')
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = raw.slice(1).map(r => {
          const date = parseDate(r[0])
          if (!date) return null
          return {
            date,
            page_views: Math.round(num(r[21])),
            unique_visitors: Math.round(num(r[24])),
          }
        }).filter(Boolean) as ImportRow[]
        fileType = 'visitors'

      } else {
        throw new Error('Bestandsnaam niet herkend. Zorg dat de naam "content", "followers" of "visitors" bevat.')
      }

      // Filter rijen met alleen nullen/nul-waarden
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
        const typeLabel: Record<string, string> = {
          content: 'Content statistieken',
          followers: 'Volgers',
          visitors: 'Bezoekers',
        }
        setUploadStatus('success')
        setUploadMessage(`✓ ${json.rowsImported} dagen geïmporteerd (${typeLabel[json.fileType] || json.fileType})`)
        setUploadDetail(`Periode: ${json.dateRange.from} t/m ${json.dateRange.to}`)
        // Herlaad data uit Supabase
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
  const avgEngagement = data.length
    ? (data.reduce((sum, d) => sum + ((d.reactions || 0) + (d.comments || 0) + (d.shares || 0)), 0) / data.length).toFixed(1)
    : '0'
  const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0)
  const top10 = [...data].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10)

  return (
    <div className="space-y-6">

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/5'
            : 'border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.02]'
        }`}
        style={{ backgroundColor: isDragging ? undefined : '#1a2035' }}
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
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Bestand importeren naar Supabase...</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={36} className="text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">{uploadMessage}</p>
            {uploadDetail && <p className="text-xs text-slate-500">{uploadDetail}</p>}
            <p className="text-xs text-slate-600 mt-1">Klik om nog een bestand te uploaden</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-sm font-semibold text-red-400">{uploadMessage}</p>
            {uploadDetail && <p className="text-xs text-slate-500">{uploadDetail}</p>}
            <p className="text-xs text-slate-600 mt-1">Klik om opnieuw te proberen</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Upload size={22} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sleep je LinkedIn exportbestand hier</p>
              <p className="text-xs text-slate-500 mt-1">of klik om te bladeren · .xls of .xlsx</p>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap justify-center">
              {['content_...xls', 'followers_...xls', 'visitors_...xls'].map(f => (
                <span key={f} className="text-xs bg-white/5 text-slate-500 px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
            <p className="text-xs text-slate-600">
              Overlappende data wordt automatisch overschreven — nooit dubbele records
            </p>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totaal Impressies', value: loading ? '...' : totalImpressions.toLocaleString('nl-NL') },
          { label: 'Avg. Engagement/dag', value: loading ? '...' : avgEngagement },
          { label: 'Dagen met data', value: loading ? '...' : data.length.toString() },
          {
            label: 'Periode',
            value: loading ? '...' : data.length > 0
              ? `${data[0].date.slice(5)} – ${data[data.length - 1].date.slice(5)}`
              : 'Nog geen data',
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4 border border-white/8" style={{ backgroundColor: '#1a2035' }}>
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/8 flex items-center justify-center h-48" style={{ backgroundColor: '#1a2035' }}>
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center h-48 gap-3" style={{ backgroundColor: '#1a2035' }}>
          <CloudUpload size={32} className="text-slate-600" />
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Nog geen LinkedIn data</p>
            <p className="text-slate-600 text-xs mt-1">Upload je eerste exportbestand via het vak hierboven</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Impressies chart */}
            <div className="rounded-xl p-5 border border-white/8" style={{ backgroundColor: '#1a2035' }}>
              <h3 className="font-semibold text-white text-sm mb-4">Impressies (laatste 30 dagen)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={4}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #ffffff15', borderRadius: '8px', fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(v) => [Number(v).toLocaleString('nl-NL'), 'Impressies']}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#6366F1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement chart */}
            <div className="rounded-xl p-5 border border-white/8" style={{ backgroundColor: '#1a2035' }}>
              <h3 className="font-semibold text-white text-sm mb-4">Engagement (laatste 30 dagen)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={4}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f1629', border: '1px solid #ffffff15', borderRadius: '8px', fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Bar dataKey="reactions" stackId="a" fill="#6366F1" name="Reacties" />
                  <Bar dataKey="comments" stackId="a" fill="#8B5CF6" name="Comments" />
                  <Bar dataKey="shares" stackId="a" fill="#A78BFA" radius={[4, 4, 0, 0]} name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 tabel */}
          <div className="rounded-xl border border-white/8 overflow-hidden" style={{ backgroundColor: '#1a2035' }}>
            <div className="px-6 py-4 border-b border-white/8">
              <h3 className="font-semibold text-white text-sm">Top 10 — Hoogste Bereik</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Datum', 'Impressies', 'Klikken', 'Reacties', 'Comments', 'Shares', 'Eng. Rate'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
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
                      <tr key={row.id || i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-300">{row.date}</td>
                        <td className="px-6 py-3 text-slate-400">{impressions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-400">{(row.clicks || 0).toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-400">{reactions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-400">{comments.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-400">{shares.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{engRate}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
