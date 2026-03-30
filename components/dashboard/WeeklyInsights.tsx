'use client'

import { useState, useEffect } from 'react'
import { Brain, CheckCircle2, Circle, AlertTriangle, TrendingUp, RefreshCw, Loader2, Sparkles, Calendar, Share2, Globe, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Action {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'linkedin' | 'website' | 'leads' | 'content'
}

interface Alert {
  message: string
  type: 'positive' | 'warning'
}

interface InsightsData {
  summary: string
  alerts: Alert[]
  actions: Action[]
  bestDayToPost?: string
  bestContentType?: string
  generatedAt: string
}

const CACHE_KEY = 'marketos_weekly_insights'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 uur

const priorityConfig = {
  high:   { label: 'Hoog',   color: '#EF4444', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFFBEB' },
  low:    { label: 'Laag',   color: '#6B7280', bg: '#F3F4F6' },
}

const categoryConfig = {
  linkedin: { label: 'LinkedIn', icon: Share2, color: '#0A66C2' },
  website:  { label: 'Website',  icon: Globe,  color: '#10B981' },
  leads:    { label: 'Leads',    icon: Target, color: '#EC4899' },
  content:  { label: 'Content',  icon: Calendar, color: '#8B5CF6' },
}

export default function WeeklyInsights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Laad voltooide acties uit localStorage
    const saved = localStorage.getItem('marketos_completed_actions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCompletedActions(new Set(parsed))
      } catch {}
    }

    // Laad alleen uit cache, nooit automatisch genereren
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        const age = Date.now() - new Date(parsed.generatedAt).getTime()
        if (age < CACHE_DURATION) {
          setData(parsed)
        }
      } catch {}
    }
  }, [])

  const generateInsights = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'dashboard' }),
      })
      if (!res.ok) throw new Error('Analyse mislukt')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      localStorage.setItem(CACHE_KEY, JSON.stringify(json))
      // Reset completed actions voor nieuwe analyse
      setCompletedActions(new Set())
      localStorage.removeItem('marketos_completed_actions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    }
    setLoading(false)
  }

  const toggleAction = async (title: string) => {
    const next = new Set(completedActions)
    if (next.has(title)) {
      next.delete(title)
    } else {
      next.add(title)
    }
    setCompletedActions(next)
    localStorage.setItem('marketos_completed_actions', JSON.stringify([...next]))

    // Probeer ook in Supabase op te slaan
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // maandag
      const weekStr = weekStart.toISOString().split('T')[0]

      if (next.has(title)) {
        await supabase.from('weekly_actions').upsert({
          week_start: weekStr,
          title,
          completed: true,
        }, { onConflict: 'week_start,title' }).select()
      }
    } catch {}
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="gradient-card-dark rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI Weekanalyse</h2>
            <p className="text-slate-400 text-xs">Wordt gegenereerd...</p>
          </div>
        </div>
        <div className="flex items-center gap-3 py-8 justify-center">
          <Loader2 size={24} className="animate-spin text-slate-400" />
          <span className="text-sm text-slate-400">Je data wordt geanalyseerd door AI...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="gradient-card-dark rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Weekanalyse</h2>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          </div>
          <button onClick={generateInsights} className="px-4 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            Opnieuw proberen
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="gradient-card-dark rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Weekanalyse</h2>
              <p className="text-slate-400 text-xs">Klik om je wekelijkse analyse te genereren</p>
            </div>
          </div>
          <button
            onClick={generateInsights}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 bg-brand"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Genereer analyse
          </button>
        </div>
      </div>
    )
  }

  const completedCount = data.actions.filter(a => completedActions.has(a.title)).length

  return (
    <div className="gradient-card-dark rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">AI Weekanalyse</h2>
            <p className="text-slate-400 text-xs">
              {completedCount}/{data.actions.length} acties afgerond · Laatst bijgewerkt {new Date(data.generatedAt).toLocaleDateString('nl-NL', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Vernieuw
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 pb-4">
        <p className="text-sm text-slate-300 leading-relaxed">{data.summary}</p>
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="px-6 pb-4 space-y-2">
          {data.alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              alert.type === 'positive'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}>
              {alert.type === 'positive' ? <TrendingUp size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      {(data.bestDayToPost || data.bestContentType) && (
        <div className="px-6 pb-4 flex gap-3">
          {data.bestDayToPost && (
            <div className="px-3 py-2 bg-white/5 rounded-lg">
              <p className="text-xs text-slate-500">Beste dag</p>
              <p className="text-sm font-semibold text-white capitalize">{data.bestDayToPost}</p>
            </div>
          )}
          {data.bestContentType && (
            <div className="px-3 py-2 bg-white/5 rounded-lg">
              <p className="text-xs text-slate-500">Beste content</p>
              <p className="text-sm font-semibold text-white">{data.bestContentType}</p>
            </div>
          )}
        </div>
      )}

      {/* Action items */}
      <div className="border-t border-white/10">
        <div className="px-6 py-3 flex items-center gap-2">
          <Sparkles size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actiepunten deze week</span>
        </div>
        <div className="px-4 pb-5 space-y-2">
          {data.actions.map((action, i) => {
            const done = completedActions.has(action.title)
            const pCfg = priorityConfig[action.priority]
            const cCfg = categoryConfig[action.category] || categoryConfig.content
            const CatIcon = cCfg.icon
            return (
              <button
                key={i}
                onClick={() => toggleAction(action.title)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
                  done ? 'bg-white/5 opacity-60' : 'bg-white/[0.07] hover:bg-white/[0.12]'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {done
                    ? <CheckCircle2 size={18} className="text-brand" />
                    : <Circle size={18} className="text-slate-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                      {action.title}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: pCfg.bg, color: pCfg.color }}>
                      {pCfg.label}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {action.description}
                  </p>
                </div>
                <div className="shrink-0 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: `${cCfg.color}20`, color: cCfg.color }}>
                    <CatIcon size={10} />
                    {cCfg.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
