'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, Zap, BriefcaseBusiness, DollarSign, Clock, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AgentMode = 'marketing' | 'sales'

const marketingStats = [
  { label: 'LinkedIn Bereik', value: '38.200', change: '+28.5%', positive: true, icon: <Users size={14} /> },
  { label: 'Engagement Rate', value: '5.4%', change: '+8.1%', positive: true, icon: <TrendingUp size={14} /> },
  { label: 'Website Sessies', value: '4.821', change: '+12.3%', positive: true, icon: <Zap size={14} /> },
  { label: 'Nieuwe Leads', value: '15', change: '-4.2%', positive: false, icon: <Target size={14} /> },
]

const topPost = {
  title: 'The anatomy of a viral B2B post',
  reach: '15.420',
  engagement: '8.9%',
}

function MarketingContext() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Context</p>
        <div className="space-y-2">
          {marketingStats.map(s => (
            <div key={s.label} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{s.icon}</span>
                <span className="text-xs text-slate-600">{s.label}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900">{s.value}</p>
                <p className={`text-xs ${s.positive ? 'text-emerald-500' : 'text-red-500'}`}>{s.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Beste Post</p>
        <div className="bg-brand-light rounded-lg p-3">
          <p className="text-xs font-medium text-indigo-900 mb-2 leading-relaxed">{topPost.title}</p>
          <div className="flex gap-3">
            <div>
              <p className="text-xs text-brand">Bereik</p>
              <p className="text-sm font-bold text-indigo-700">{topPost.reach}</p>
            </div>
            <div>
              <p className="text-xs text-brand">Engagement</p>
              <p className="text-sm font-bold text-indigo-700">{topPost.engagement}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tips</p>
        <div className="space-y-2">
          {['Post tussen 7-9u of 17-19u', 'Gebruik opsommingen voor hogere engagement', 'Reageer binnen 1u op comments'].map(tip => (
            <div key={tip} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="text-brand mt-0.5">•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SalesContext() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    pipelineValue: 0,
    wonValue: 0,
    followUpsToday: 0,
    highPriority: 0,
  })
  const [recentLeads, setRecentLeads] = useState<Array<{ name: string; company: string; status: string }>>([])

  useEffect(() => {
    loadSalesData()
  }, [])

  const loadSalesData = async () => {
    const [leadsRes, followupsRes] = await Promise.all([
      supabase.from('leads').select('name, company, status, estimated_value, priority, next_action_date').order('created_at', { ascending: false }),
      supabase.from('leads').select('name, company, next_action_date')
        .not('next_action_date', 'is', null)
        .lte('next_action_date', new Date().toISOString().split('T')[0]),
    ])

    const leads = leadsRes.data || []
    const followups = followupsRes.data || []

    setStats({
      totalLeads: leads.length,
      pipelineValue: leads.reduce((s, l) => s + (l.estimated_value || 0), 0),
      wonValue: leads.filter(l => l.status === 'won').reduce((s, l) => s + (l.estimated_value || 0), 0),
      followUpsToday: followups.length,
      highPriority: leads.filter(l => l.priority === 'high').length,
    })

    setRecentLeads(leads.slice(0, 5).map(l => ({ name: l.name, company: l.company, status: l.status })))
  }

  const salesStats = [
    { label: 'Totaal Leads', value: String(stats.totalLeads), icon: <Users size={14} /> },
    { label: 'Pipeline Waarde', value: `€${stats.pipelineValue.toLocaleString('nl-NL')}`, icon: <DollarSign size={14} /> },
    { label: 'Gewonnen', value: `€${stats.wonValue.toLocaleString('nl-NL')}`, icon: <Trophy size={14} /> },
    { label: 'Follow-ups vandaag', value: String(stats.followUpsToday), icon: <Clock size={14} />, highlight: stats.followUpsToday > 0 },
    { label: 'Hoge prioriteit', value: String(stats.highPriority), icon: <Target size={14} />, highlight: stats.highPriority > 0 },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sales Overview</p>
        <div className="space-y-2">
          {salesStats.map(s => (
            <div key={s.label} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{s.icon}</span>
                <span className="text-xs text-slate-600">{s.label}</span>
              </div>
              <p className={`text-xs font-semibold ${s.highlight ? 'text-amber-600' : 'text-slate-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recente Leads</p>
        <div className="space-y-1.5">
          {recentLeads.map((lead, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2">
              <div>
                <p className="text-xs font-medium text-slate-800">{lead.name}</p>
                <p className="text-xs text-slate-400">{lead.company}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                lead.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                lead.status === 'qualified' ? 'bg-blue-100 text-blue-700' :
                lead.status === 'new' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>{lead.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Agent Tips</p>
        <div className="space-y-2">
          {[
            'Vraag: "Wie moet ik vandaag opvolgen?"',
            'Vraag: "Geef me een pipeline overzicht"',
            'Vraag: "Toon leads met hoge prioriteit"',
          ].map(tip => (
            <div key={tip} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="text-amber-500 mt-0.5">•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ContextPanel({ mode = 'marketing' }: { mode?: AgentMode }) {
  return mode === 'sales' ? <SalesContext /> : <MarketingContext />
}
