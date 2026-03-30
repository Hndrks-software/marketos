'use client'

import { useState } from 'react'
import { Lightbulb, RefreshCw, TrendingUp, Globe, Users, Mail, Search, Share2, AlertCircle } from 'lucide-react'

interface Tip {
  title: string
  description: string
  category: string
  impact: 'Hoog' | 'Medium' | 'Laag'
  timeframe: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  'SEO & Content': <Search size={16} />,
  'LinkedIn': <Share2 size={16} />,
  'Lead Generation': <Users size={16} />,
  'Website Optimalisatie': <Globe size={16} />,
  'Email Marketing': <Mail size={16} />,
  'Social Media': <TrendingUp size={16} />,
}

const impactColors: Record<string, { bg: string; text: string; dot: string }> = {
  'Hoog': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'Medium': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  'Laag': { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
}

const categoryColors: Record<string, string> = {
  'SEO & Content': 'text-violet-400 bg-violet-500/10',
  'LinkedIn': 'text-blue-400 bg-blue-500/10',
  'Lead Generation': 'text-indigo-400 bg-indigo-500/10',
  'Website Optimalisatie': 'text-cyan-400 bg-cyan-500/10',
  'Email Marketing': 'text-pink-400 bg-pink-500/10',
  'Social Media': 'text-orange-400 bg-orange-500/10',
}

function TipCard({ tip, index }: { tip: Tip; index: number }) {
  const impact = impactColors[tip.impact] || impactColors['Medium']
  const catStyle = categoryColors[tip.category] || 'text-slate-400 bg-slate-500/10'
  const icon = categoryIcons[tip.category] || <Lightbulb size={16} />

  return (
    <div
      className="rounded-xl border border-white/8 p-5 flex flex-col gap-3 hover:border-indigo-500/30 transition-all duration-200"
      style={{ backgroundColor: '#1a2035' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${catStyle}`}>
            {icon}
            {tip.category}
          </span>
        </div>
        <span className="text-slate-500 text-xs font-medium shrink-0">#{index + 1}</span>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-sm leading-snug">{tip.title}</h3>

      {/* Description */}
      <p className="text-slate-400 text-xs leading-relaxed flex-1">{tip.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${impact.bg} ${impact.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${impact.dot}`} />
          {tip.impact} impact
        </div>
        <span className="text-slate-500 text-xs">{tip.timeframe}</span>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/8 p-5 flex flex-col gap-3 animate-pulse" style={{ backgroundColor: '#1a2035' }}>
      <div className="flex gap-2">
        <div className="h-6 w-28 bg-white/5 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-white/5 rounded" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-3 w-5/6 bg-white/5 rounded" />
        <div className="h-3 w-4/6 bg-white/5 rounded" />
      </div>
      <div className="flex justify-between pt-1 border-t border-white/5">
        <div className="h-5 w-24 bg-white/5 rounded-full" />
        <div className="h-5 w-20 bg-white/5 rounded" />
      </div>
    </div>
  )
}

export default function MarketingTips() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tips', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setTips(data.tips || [])
        setGeneratedAt(data.generatedAt)
        setHasLoaded(true)
      }
    } catch (e) {
      setError('Verbinding mislukt. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6366F1' }}>
            <Lightbulb size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">AI Marketingtips</h2>
            <p className="text-slate-500 text-xs">
              {generatedAt
                ? `Gegenereerd om ${formatTime(generatedAt)} · Gebaseerd op jouw data + actuele trends`
                : 'Gepersonaliseerde tips op basis van jouw data + actuele internettrends'}
            </p>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#6366F1' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Genereren...' : hasLoaded ? 'Vernieuwen' : 'Genereer tips'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-4">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
            <RefreshCw size={14} className="text-indigo-400 animate-spin" />
            <p className="text-indigo-300 text-xs">
              Zoekt naar actuele B2B-trends en analyseert jouw data... Dit duurt ~15 seconden.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Tips grid */}
      {!loading && tips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, i) => (
            <TipCard key={i} tip={tip} index={i} />
          ))}
        </div>
      )}

      {/* Empty state (before first load) */}
      {!loading && !hasLoaded && !error && (
        <div
          className="rounded-xl border border-dashed border-white/10 p-8 flex flex-col items-center justify-center text-center gap-3"
          style={{ backgroundColor: '#1a2035' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-500/10">
            <Lightbulb size={22} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Klaar voor gepersonaliseerde tips?</p>
            <p className="text-slate-500 text-xs mt-1">
              Klik op &quot;Genereer tips&quot; om AI jouw data te laten analyseren en actuele trends te zoeken.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
