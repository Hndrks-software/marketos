'use client'

import { useState, useEffect } from 'react'
import { Brain, Loader2, RefreshCw, Lightbulb, AlertTriangle } from 'lucide-react'

interface PageInsightProps {
  page: 'linkedin' | 'website'
}

interface LinkedInInsight {
  insight: string
  bestDayToPost?: string
  bestContentType?: string
  tip: string
}

interface WebsiteInsight {
  insight: string
  problemPage?: { path: string; issue: string; fix: string }
  tip: string
}

const CACHE_PREFIX = 'marketos_insight_'
const CACHE_DURATION = 12 * 60 * 60 * 1000 // 12 uur

export default function PageInsight({ page }: PageInsightProps) {
  const [data, setData] = useState<LinkedInInsight | WebsiteInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cacheKey = CACHE_PREFIX + page

  useEffect(() => {
    // Laad alleen uit cache, nooit automatisch genereren
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed._cachedAt < CACHE_DURATION) {
          setData(parsed)
        }
      } catch {}
    }
  }, [page, cacheKey])

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page }),
      })
      if (!res.ok) throw new Error('Analyse mislukt')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const withCache = { ...json, _cachedAt: Date.now() }
      setData(withCache)
      localStorage.setItem(cacheKey, JSON.stringify(withCache))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout')
    }
    setLoading(false)
  }

  if (loading && !data) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">AI analyseert je data...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertTriangle size={16} className="text-amber-500" />
          Analyse niet beschikbaar
        </div>
        <button onClick={generate} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          Probeer opnieuw
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#91B24A' }}>
            <Brain size={14} className="text-white" />
          </div>
          <span className="text-sm text-slate-300">AI Inzicht beschikbaar</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#91B24A' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
          Genereer inzicht
        </button>
      </div>
    )
  }

  const isLinkedIn = page === 'linkedin'
  const linkedIn = data as LinkedInInsight
  const website = data as WebsiteInsight

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#91B24A' }}>
            <Brain size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">AI Inzicht</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Vernieuw
        </button>
      </div>

      {/* Main insight */}
      <p className="text-sm text-slate-300 leading-relaxed mb-3">
        {isLinkedIn ? linkedIn.insight : website.insight}
      </p>

      <div className="flex flex-wrap gap-3">
        {/* LinkedIn specific */}
        {isLinkedIn && linkedIn.bestDayToPost && (
          <div className="px-3 py-1.5 bg-white/5 rounded-lg">
            <span className="text-xs text-slate-500">Beste dag</span>
            <p className="text-xs font-semibold text-white capitalize">{linkedIn.bestDayToPost}</p>
          </div>
        )}
        {isLinkedIn && linkedIn.bestContentType && (
          <div className="px-3 py-1.5 bg-white/5 rounded-lg">
            <span className="text-xs text-slate-500">Beste type</span>
            <p className="text-xs font-semibold text-white">{linkedIn.bestContentType}</p>
          </div>
        )}

        {/* Website specific */}
        {!isLinkedIn && website.problemPage && (
          <div className="px-3 py-2 bg-amber-500/10 rounded-lg flex-1 min-w-48">
            <span className="text-xs text-amber-400 font-medium">Aandachtspunt: {website.problemPage.path}</span>
            <p className="text-xs text-slate-400 mt-0.5">{website.problemPage.issue}</p>
            <p className="text-xs text-emerald-400 mt-0.5">{website.problemPage.fix}</p>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-white/5 rounded-lg">
        <Lightbulb size={14} className="mt-0.5 shrink-0" style={{ color: '#91B24A' }} />
        <p className="text-xs text-slate-300">{isLinkedIn ? linkedIn.tip : website.tip}</p>
      </div>
    </div>
  )
}
