'use client'

import { Share2, Globe, Mail, TrendingUp, UserPlus } from 'lucide-react'
import { Post, Lead } from '@/lib/supabase'

const channelIcon = {
  linkedin: <Share2 size={14} className="text-blue-500" />,
  website: <Globe size={14} className="text-emerald-500" />,
  email: <Mail size={14} className="text-purple-500" />,
}

const sourceLabel: Record<string, string> = {
  linkedin: 'LinkedIn',
  website: 'Website',
  direct: 'Direct',
  other: 'Overig',
}

interface ActivityFeedProps {
  posts: Post[]
  leads: Lead[]
}

export default function ActivityFeed({ posts, leads }: ActivityFeedProps) {
  const recentPosts = posts.filter(p => p.status === 'live').slice(0, 5)
  const recentLeads = leads.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-brand" />
          <h3 className="font-semibold text-slate-900 text-sm">Recente Posts</h3>
        </div>
        <div className="space-y-3">
          {recentPosts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Geen live posts gevonden</p>
          ) : recentPosts.map(post => (
            <div key={post.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="mt-0.5">{channelIcon[post.channel]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(post.reach || 0).toLocaleString('nl-NL')} bereik · {post.engagement_rate || 0}% engagement
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={16} className="text-brand" />
          <h3 className="font-semibold text-slate-900 text-sm">Nieuwe Leads</h3>
        </div>
        <div className="space-y-3">
          {recentLeads.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nog geen leads</p>
          ) : recentLeads.map(lead => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-brand text-xs font-semibold">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{lead.name}</p>
                  <p className="text-xs text-slate-400">{lead.company} · {sourceLabel[lead.source] || lead.source}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500">
                €{(lead.estimated_value || 0).toLocaleString('nl-NL')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
