'use client'

import { useState, useEffect, useRef } from 'react'
import { CloudUpload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { mockLinkedInAnalytics } from '@/lib/mockData'
import { supabase, LinkedInAnalytics } from '@/lib/supabase'

export default function LinkedInPage() {
  const [data, setData] = useState<LinkedInAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('linkedin_analytics')
      .select('*')
      .order('date', { ascending: true })

    if (error || !rows || rows.length === 0) {
      setData(mockLinkedInAnalytics)
    } else {
      setData(rows as LinkedInAnalytics[])
    }
    setLoading(false)
  }

  const handleUpload = async (file: File) => {
    setUploadStatus('loading')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) {
        setData(json.records as LinkedInAnalytics[])
        setUploadStatus('success')
        setUploadMessage(`${json.count} records succesvol geladen`)
      } else {
        setUploadStatus('error')
        setUploadMessage(json.error || 'Upload mislukt')
      }
    } catch {
      setUploadStatus('error')
      setUploadMessage('Er is een netwerkfout opgetreden')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleUpload(file)
  }

  const last30 = data.slice(-30)
  const avgEngagement = data.length
    ? (data.reduce((sum, d) => sum + (d.reactions + d.comments + d.shares), 0) / data.length).toFixed(1)
    : '0'
  const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0)
  const top10 = [...data].sort((a, b) => b.impressions - a.impressions).slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        {uploadStatus === 'loading' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Bestand verwerken...</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={36} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{uploadMessage}</p>
            <p className="text-xs text-slate-400">Klik om nieuw bestand te uploaden</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-sm font-medium text-red-600">{uploadMessage}</p>
            <p className="text-xs text-slate-400">Klik om opnieuw te proberen</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <CloudUpload size={22} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Sleep je LinkedIn CSV hier naartoe</p>
              <p className="text-xs text-slate-400 mt-1">of klik om te bladeren · CSV formaat vereist</p>
            </div>
            <p className="text-xs text-slate-300">Verwachte kolommen: Date, Impressions, Clicks, Reactions, Comments, Shares</p>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totaal Impressies', value: totalImpressions.toLocaleString('nl-NL') },
          { label: 'Avg. Engagement/dag', value: avgEngagement },
          { label: 'Datapunten', value: data.length.toString() },
          { label: 'Periode', value: data.length > 0 ? `${data[0].date} – ${data[data.length - 1].date}` : 'N/A' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm mb-4">Impressies over tijd</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                  <Line type="monotone" dataKey="impressions" stroke="#6366F1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm mb-4">Engagement metrics</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="reactions" stackId="a" fill="#6366F1" name="Reacties" />
                  <Bar dataKey="comments" stackId="a" fill="#8B5CF6" name="Comments" />
                  <Bar dataKey="shares" stackId="a" fill="#A78BFA" radius={[4, 4, 0, 0]} name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Top 10 Datums — Hoogste Bereik</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Datum', 'Impressies', 'Clicks', 'Reacties', 'Comments', 'Shares', 'Eng. Rate'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {top10.map((row, i) => {
                    const engRate = row.impressions > 0
                      ? (((row.reactions + row.comments + row.shares) / row.impressions) * 100).toFixed(2)
                      : '0'
                    return (
                      <tr key={row.id || i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-800">{row.date}</td>
                        <td className="px-6 py-3 text-slate-600">{row.impressions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{row.clicks.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{row.reactions.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{row.comments.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3 text-slate-600">{row.shares.toLocaleString('nl-NL')}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{engRate}%</span>
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
