'use client'

import { useEffect, useState } from 'react'
import { Users, Euro, Trophy, TrendingUp, Calculator, Phone, Mail, Calendar, MessageSquare, ArrowRight, Clock } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import KPICard from '@/components/dashboard/KPICard'
import { supabase } from '@/lib/supabase'
import type { Lead, PipelineStage, LeadActivity } from '@/lib/supabase'
import Link from 'next/link'

export default function SalesDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [activities, setActivities] = useState<(LeadActivity & { lead_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [leadsRes, stagesRes, activitiesRes] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('pipeline_stages').select('*').order('position'),
        supabase.from('lead_activities').select('*').order('created_at', { ascending: false }).limit(10),
      ])

      const leadsData = (leadsRes.data || []) as Lead[]
      const stagesData = (stagesRes.data || []) as PipelineStage[]
      const activitiesData = (activitiesRes.data || []) as LeadActivity[]

      // Enrich activities with lead names
      const leadMap = new Map(leadsData.map(l => [l.id, l.name]))
      const enriched = activitiesData.map(a => ({
        ...a,
        lead_name: leadMap.get(a.lead_id) || 'Onbekend',
      }))

      setLeads(leadsData)
      setStages(stagesData)
      setActivities(enriched)
      setLoading(false)
    }
    load()
  }, [])

  // Stage helpers
  const stageMap = new Map(stages.map(s => [s.id, s]))
  const wonStage = stages.find(s => s.name === 'Gewonnen')
  const lostStage = stages.find(s => s.name === 'Verloren')

  // Filter leads
  const activeLeads = leads.filter(l => l.stage_id !== lostStage?.id)
  const wonLeads = leads.filter(l => l.stage_id === wonStage?.id)
  const totalLeads = leads.filter(l => l.stage_id !== lostStage?.id).length
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const wonValue = wonLeads.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const conversionRate = leads.length > 0 ? ((wonLeads.length / leads.length) * 100).toFixed(1) : '0'
  const avgDeal = activeLeads.length > 0 ? Math.round(pipelineValue / activeLeads.length) : 0

  // Pipeline funnel data
  const funnelData = stages
    .filter(s => s.name !== 'Verloren')
    .map(s => ({
      name: s.name,
      leads: leads.filter(l => l.stage_id === s.id).length,
      waarde: leads.filter(l => l.stage_id === s.id).reduce((sum, l) => sum + (l.estimated_value || 0), 0),
      fill: s.color,
    }))

  // Source donut data
  const sourceCount = leads.reduce((acc: Record<string, number>, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})
  const sourceColors: Record<string, string> = {
    linkedin: '#0077b5', website: '#8B5CF6', direct: '#10B981', other: '#f59e0b',
  }
  const sourceLabels: Record<string, string> = {
    linkedin: 'LinkedIn', website: 'Website', direct: 'Direct', other: 'Overig',
  }
  const sourceData = Object.entries(sourceCount).map(([key, val]) => ({
    name: sourceLabels[key] || key,
    value: val,
    color: sourceColors[key] || '#94a3b8',
  }))

  // Leads over time (last 12 weeks)
  const weeklyLeads = (() => {
    const now = new Date()
    const weeks: { week: string; leads: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const count = leads.filter(l => {
        const d = new Date(l.created_at)
        return d >= weekStart && d < weekEnd
      }).length
      weeks.push({
        week: `W${12 - i}`,
        leads: count,
      })
    }
    return weeks
  })()

  // Upcoming actions (next 7 days)
  const upcomingActions = leads
    .filter(l => l.next_action && l.next_action_date)
    .filter(l => {
      const d = new Date(l.next_action_date!)
      const now = new Date()
      const weekFromNow = new Date(now)
      weekFromNow.setDate(now.getDate() + 7)
      return d >= now && d <= weekFromNow
    })
    .sort((a, b) => new Date(a.next_action_date!).getTime() - new Date(b.next_action_date!).getTime())
    .slice(0, 8)

  // Activity icons
  const activityIcons: Record<string, React.ReactNode> = {
    call: <Phone size={14} />,
    email: <Mail size={14} />,
    meeting: <Calendar size={14} />,
    note: <MessageSquare size={14} />,
    status_change: <ArrowRight size={14} />,
  }
  const activityColors: Record<string, string> = {
    call: 'bg-blue-100 text-blue-600',
    email: 'bg-purple-100 text-purple-600',
    meeting: 'bg-emerald-100 text-emerald-600',
    note: 'bg-slate-100 text-slate-600',
    status_change: 'bg-amber-100 text-amber-600',
  }

  function formatValue(val: number): string {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
    return val.toString()
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m geleden`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}u geleden`
    const days = Math.floor(hours / 24)
    return `${days}d geleden`
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (d.toDateString() === now.toDateString()) return 'Vandaag'
    if (d.toDateString() === tomorrow.toDateString()) return 'Morgen'
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200/60 animate-pulse h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200/60 animate-pulse h-72" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Totaal Leads"
          value={totalLeads.toString()}
          change={0}
          changeLabel="actieve leads"
          icon={<Users size={20} />}
          color="#3b82f6"
        />
        <KPICard
          title="Pipeline Waarde"
          value={`\u20AC${formatValue(pipelineValue)}`}
          change={0}
          changeLabel="totale waarde"
          icon={<Euro size={20} />}
          color="#8B5CF6"
        />
        <KPICard
          title="Gewonnen Waarde"
          value={`\u20AC${formatValue(wonValue)}`}
          change={0}
          changeLabel="gesloten deals"
          icon={<Trophy size={20} />}
          color="#10B981"
        />
        <KPICard
          title="Conversie Rate"
          value={`${conversionRate}%`}
          change={0}
          changeLabel="gewonnen / totaal"
          icon={<TrendingUp size={20} />}
          color="#f59e0b"
        />
        <KPICard
          title="Gem. Deal Grootte"
          value={`\u20AC${formatValue(avgDeal)}`}
          change={0}
          changeLabel="per actieve lead"
          icon={<Calculator size={20} />}
          color="#EC4899"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Pipeline Funnel</h3>
            <Link href="/sales/pipeline" className="text-xs text-brand hover:underline">
              Bekijk pipeline &rarr;
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={110} />
              <Tooltip
                formatter={(v) => [v, 'Leads']}
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }}
              />
              <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads per Bron */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Leads per Bron</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [v, 'Leads']}
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {sourceData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-slate-600">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-800">{s.value}</span>
                    <span className="text-xs text-slate-400 ml-1">
                      ({leads.length > 0 ? Math.round((s.value / leads.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads over Tijd */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Nieuwe Leads per Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyLeads}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'Leads']}
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#leadGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Aankomende Acties */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Aankomende Acties</h3>
            <span className="text-xs text-slate-400">Komende 7 dagen</span>
          </div>
          {upcomingActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Clock size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Geen acties gepland</p>
              <p className="text-xs mt-1">Voeg acties toe in de Pipeline</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {upcomingActions.map(lead => (
                <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.next_action}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {formatDate(lead.next_action_date!)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recente Activiteiten */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-sm">Recente Activiteiten</h3>
          <Link href="/sales/pipeline" className="text-xs text-brand hover:underline">
            Naar Pipeline &rarr;
          </Link>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nog geen activiteiten geregistreerd</p>
        ) : (
          <div className="space-y-3">
            {activities.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activityColors[a.type] || 'bg-slate-100 text-slate-600'}`}>
                  {activityIcons[a.type] || <MessageSquare size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{a.lead_name}</span>
                    <span className="text-slate-400"> — </span>
                    <span className="text-slate-600">{a.description}</span>
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {timeAgo(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
