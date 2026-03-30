'use client'

import { TrendingUp, Users, Target, Zap } from 'lucide-react'

const stats = [
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

export default function ContextPanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Live Context</p>
        <div className="space-y-2">
          {stats.map(s => (
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
        <div className="bg-indigo-50 rounded-lg p-3">
          <p className="text-xs font-medium text-indigo-900 mb-2 leading-relaxed">{topPost.title}</p>
          <div className="flex gap-3">
            <div>
              <p className="text-xs text-indigo-500">Bereik</p>
              <p className="text-sm font-bold text-indigo-700">{topPost.reach}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-500">Engagement</p>
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
              <span className="text-indigo-400 mt-0.5">•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
