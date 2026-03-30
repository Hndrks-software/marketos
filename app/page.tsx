'use client'

import { useEffect, useState } from 'react'
import { Users, MousePointerClick, Target, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import KPICard from '@/components/dashboard/KPICard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import { supabase, Post, Lead, LinkedInAnalytics } from '@/lib/supabase'
import { mockWeeklyReach, mockDailyVisitors, mockLeadSources, mockPosts, mockLeads, mockLinkedInAnalytics } from '@/lib/mockData'

interface DashboardData {
  posts: Post[]
  leads: Lead[]
  analytics: LinkedInAnalytics[]
}

function buildWeeklyReach(analytics: LinkedInAnalytics[]) {
  if (analytics.length === 0) return mockWeeklyReach
  const sorted = [...analytics].sort((a, b) => a.date.localeCompare(b.date))
  const weeks: { week: string; reach: number }[] = []
  for (let i = 0; i < sorted.length; i += 7) {
    const chunk = sorted.slice(i, i + 7)
    const total = chunk.reduce((s, d) => s + d.impressions, 0)
    const label = `W${Math.floor(i / 7) + 1}`
    weeks.push({ week: label, reach: total })
  }
  return weeks.slice(-8)
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ posts: [], leads: [], analytics: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      const [postsRes, leadsRes, analyticsRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('linkedin_analytics').select('*').order('date', { ascending: true }),
      ])

      setData({
        posts: (postsRes.data && postsRes.data.length > 0) ? postsRes.data as Post[] : mockPosts as Post[],
        leads: (leadsRes.data && leadsRes.data.length > 0) ? leadsRes.data as Lead[] : mockLeads as Lead[],
        analytics: (analyticsRes.data && analyticsRes.data.length > 0) ? analyticsRes.data as LinkedInAnalytics[] : mockLinkedInAnalytics,
      })
      setLoading(false)
    }
    loadAll()
  }, [])

  const { posts, leads, analytics } = data

  // KPI calculations
  const totalReach = analytics.reduce((s, d) => s + d.impressions, 0)
  const thisMonthAnalytics = analytics.filter(d => {
    const date = new Date(d.date)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const lastMonthAnalytics = analytics.filter(d => {
    const date = new Date(d.date)
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
  })
  const thisMonthReach = thisMonthAnalytics.reduce((s, d) => s + d.impressions, 0)
  const lastMonthReach = lastMonthAnalytics.reduce((s, d) => s + d.impressions, 0)
  const reachChange = lastMonthReach > 0 ? Math.round(((thisMonthReach - lastMonthReach) / lastMonthReach) * 100) : 0

  const livePosts = posts.filter(p => p.status === 'live')
  const avgEngagement = livePosts.length > 0
    ? (livePosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / livePosts.length).toFixed(1)
    : '0'

  const newLeads = leads.filter(l => {
    const created = new Date(l.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  })

  // Lead sources from actual data
  const sourceCount = leads.reduce((acc: Record<string, number>, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})
  const sourceColors: Record<string, string> = {
    linkedin: '#6366F1', website: '#8B5CF6', direct: '#A78BFA', other: '#C4B5FD',
  }
  const sourceLabels: Record<string, string> = {
    linkedin: 'LinkedIn', website: 'Website', direct: 'Direct', other: 'Overig',
  }
  const leadSourceData = leads.length > 0
    ? Object.entries(sourceCount).map(([key, val]) => ({
        name: sourceLabels[key] || key,
        value: Math.round((val / leads.length) * 100),
        color: sourceColors[key] || '#DDD6FE',
      }))
    : mockLeadSources

  const weeklyReach = buildWeeklyReach(analytics)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="LinkedIn Bereik"
          value={loading ? '...' : (thisMonthReach || totalReach).toLocaleString('nl-NL')}
          change={reachChange}
          changeLabel="vs. vorige maand"
          icon={<Users size={20} />}
          color="#6366F1"
        />
        <KPICard
          title="Website Sessies"
          value="4.821"
          change={12.3}
          changeLabel="vs. vorige maand"
          icon={<MousePointerClick size={20} />}
          color="#8B5CF6"
        />
        <KPICard
          title="Nieuwe Leads"
          value={loading ? '...' : newLeads.length.toString()}
          change={0}
          changeLabel="deze maand"
          icon={<Target size={20} />}
          color="#EC4899"
        />
        <KPICard
          title="Avg. Engagement Rate"
          value={loading ? '...' : `${avgEngagement}%`}
          change={8.1}
          changeLabel="vs. vorige maand"
          icon={<TrendingUp size={20} />}
          color="#10B981"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">LinkedIn Bereik (wekelijks)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyReach}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('nl-NL'), 'Bereik']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
              <Line type="monotone" dataKey="reach" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: '#6366F1', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Websitebezoekers (14 dagen)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockDailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('nl-NL'), 'Bezoekers']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
              <Bar dataKey="visitors" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lead Sources + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Leadbronnen</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {leadSourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, 'Aandeel']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {leadSourceData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-slate-600">{s.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-800">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <ActivityFeed posts={posts} leads={leads} />
        </div>
      </div>
    </div>
  )
}
