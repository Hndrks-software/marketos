'use client'

import { Users, MousePointerClick, Target, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import KPICard from '@/components/dashboard/KPICard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import { mockWeeklyReach, mockDailyVisitors, mockLeadSources } from '@/lib/mockData'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="LinkedIn Bereik"
          value="38.200"
          change={28.5}
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
          value="15"
          change={-4.2}
          changeLabel="vs. vorige maand"
          icon={<Target size={20} />}
          color="#EC4899"
        />
        <KPICard
          title="Avg. Engagement Rate"
          value="5.4%"
          change={8.1}
          changeLabel="vs. vorige maand"
          icon={<TrendingUp size={20} />}
          color="#10B981"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LinkedIn reach line chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">LinkedIn Bereik (8 weken)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockWeeklyReach}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('nl-NL'), 'Bereik']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
              <Line type="monotone" dataKey="reach" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: '#6366F1', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Website visitors bar chart */}
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

      {/* Lead Sources Donut + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Leadbronnen</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={mockLeadSources}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {mockLeadSources.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, 'Aandeel']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {mockLeadSources.map(s => (
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

        {/* Activity feed spans 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
