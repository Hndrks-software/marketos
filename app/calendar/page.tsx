'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, Share2, Globe, Mail, Loader2, LayoutGrid } from 'lucide-react'
import { Post } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import PostModal from '@/components/calendar/PostModal'
import { cn } from '@/lib/utils'

const statusConfig = {
  idea:      { label: 'Idee',     color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', header: '#f8fafc' },
  concept:   { label: 'Concept',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', header: '#f0f7ff' },
  review:    { label: 'Review',   color: '#f97316', bg: '#fff7ed', border: '#fed7aa', header: '#fffbf5' },
  scheduled: { label: 'Gepland',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', header: '#faf8ff' },
  live:      { label: 'Live',     color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', header: '#f0fdf9' },
}

const channelConfig = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2', bg: '#e8f0fe', icon: <Share2 size={11} /> },
  website:  { label: 'Website',  color: '#10b981', bg: '#ecfdf5', icon: <Globe size={11} /> },
  email:    { label: 'E-mail',   color: '#f97316', bg: '#fff7ed', icon: <Mail size={11} /> },
}

const DAYS   = ['Ma','Di','Wo','Do','Vr','Za','Zo']
const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

type View = 'kanban' | 'calendar' | 'list'
type Channel = 'all' | 'linkedin' | 'website' | 'email'

export default function CalendarPage() {
  const [posts, setPosts]         = useState<Post[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<View>('kanban')
  const [channel, setChannel]     = useState<Channel>('all')
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<Partial<Post> | undefined>()
  const [defaultStatus, setDefaultStatus] = useState<Post['status']>('idea')

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts').select('*').order('scheduled_date', { ascending: true })
    setPosts(!error && data ? (data as Post[]) : [])
    setLoading(false)
  }

  const handleSave = async (postData: Partial<Post>) => {
    if (postData.id) {
      const { error } = await supabase.from('posts').update({
        title: postData.title, content: postData.content,
        channel: postData.channel, scheduled_date: postData.scheduled_date,
        status: postData.status, tags: postData.tags,
      }).eq('id', postData.id)
      if (!error) setPosts(prev => prev.map(p => p.id === postData.id ? { ...p, ...postData } as Post : p))
    } else {
      const { data, error } = await supabase.from('posts').insert({
        title: postData.title || '', content: postData.content || '',
        channel: postData.channel || 'linkedin',
        scheduled_date: postData.scheduled_date || new Date().toISOString().split('T')[0],
        status: postData.status || 'idea', tags: postData.tags || [],
        reach: 0, engagement_rate: 0,
      }).select().single()
      if (!error && data) setPosts(prev => [...prev, data as Post])
    }
    setShowModal(false)
    setEditingPost(undefined)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (!error) setPosts(prev => prev.filter(p => p.id !== id))
    setShowModal(false)
    setEditingPost(undefined)
  }

  const openNew = (status: Post['status'] = 'idea') => {
    setDefaultStatus(status)
    setEditingPost({ status })
    setShowModal(true)
  }

  const filteredPosts = channel === 'all' ? posts : posts.filter(p => p.channel === channel)

  // ── KANBAN ────────────────────────────────────────────────────────────────
  const KanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {(Object.entries(statusConfig) as [Post['status'], typeof statusConfig[keyof typeof statusConfig]][]).map(([status, cfg]) => {
        const colPosts = filteredPosts.filter(p => p.status === status)
        return (
          <div key={status} className="flex-shrink-0 w-64 flex flex-col rounded-xl border overflow-hidden" style={{ borderColor: cfg.border }}>
            {/* Column header */}
            <div className="px-3 py-3 flex items-center justify-between" style={{ backgroundColor: cfg.header, borderBottom: `1px solid ${cfg.border}` }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {colPosts.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-32 bg-white">
              {colPosts.map(post => {
                const ch = channelConfig[post.channel]
                const dateStr = post.scheduled_date
                  ? new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                  : null
                return (
                  <button
                    key={post.id}
                    onClick={() => { setEditingPost(post); setShowModal(true) }}
                    className="w-full text-left bg-white rounded-lg border border-slate-100 p-3 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    {/* Channel badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: ch.bg, color: ch.color }}>
                        {ch.icon} {ch.label}
                      </span>
                      {dateStr && (
                        <span className="text-xs text-slate-400">{dateStr}</span>
                      )}
                    </div>
                    {/* Title */}
                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2 mb-2">{post.title}</p>
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">#{t}</span>
                        ))}
                        {post.tags.length > 2 && <span className="text-xs text-slate-400">+{post.tags.length - 2}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Add button */}
            <button
              onClick={() => openNew(status)}
              className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-t hover:opacity-80"
              style={{ backgroundColor: cfg.header, color: cfg.color, borderColor: cfg.border }}
            >
              <Plus size={13} /> Toevoegen
            </button>
          </div>
        )
      })}
    </div>
  )

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay   = new Date(year, month, 1)
  const lastDay    = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const days = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1
    return (d < 1 || d > lastDay.getDate()) ? null : d
  })
  const today = new Date()

  const CalendarView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={15} className="text-slate-600" />
          </button>
          <h3 className="font-semibold text-slate-900 w-36 text-center">{MONTHS[month]} {year}</h3>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronRight size={15} className="text-slate-600" />
          </button>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          {Object.entries(statusConfig).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: val.color }} />
              <span className="text-xs text-slate-500">{val.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const dayPosts = day ? filteredPosts.filter(p => p.scheduled_date === dateStr) : []
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          return (
            <div key={i} className={cn('min-h-28 p-2 border-b border-r border-slate-50 hover:bg-slate-50/50 transition-colors', !day && 'bg-slate-50/30')}>
              {day && (
                <>
                  <span className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1', isToday ? 'text-white' : 'text-slate-600')}
                    style={isToday ? { backgroundColor: '#6366F1' } : {}}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map(post => {
                      const cfg = statusConfig[post.status]
                      const ch  = channelConfig[post.channel]
                      return (
                        <button key={post.id} onClick={() => { setEditingPost(post); setShowModal(true) }}
                          className="w-full text-left px-1.5 py-1 rounded text-xs font-medium truncate flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          <span style={{ color: ch.color }}>{ch.icon}</span>
                          <span className="truncate">{post.title}</span>
                        </button>
                      )
                    })}
                    {dayPosts.length > 3 && <p className="text-xs text-slate-400 pl-1">+{dayPosts.length - 3} meer</p>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── LIST ──────────────────────────────────────────────────────────────────
  const ListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarDays size={32} className="mb-3 opacity-40" />
          <p className="text-sm">Nog geen posts gepland</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Datum</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Kanaal</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Titel</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Tags</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPosts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(post => {
              const sCfg = statusConfig[post.status]
              const ch   = channelConfig[post.channel]
              return (
                <tr key={post.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: ch.bg, color: ch.color }}>
                      {ch.icon} {ch.label}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 max-w-xs">
                    <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                    {post.content && <p className="text-xs text-slate-400 truncate mt-0.5">{post.content.slice(0, 60)}...</p>}
                  </td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(post.tags || []).slice(0, 3).map(t => (
                        <span key={t} className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">#{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                      {sCfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => { setEditingPost(post); setShowModal(true) }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                      Bewerk
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Content kalender</h1>
          <p className="text-xs text-slate-400 mt-0.5">{posts.length} posts in totaal · {posts.filter(p => p.status === 'scheduled' || p.status === 'live').length} gepland of live</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Channel filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'linkedin', 'website', 'email'] as Channel[]).map(ch => {
              const label = ch === 'all' ? 'Alles' : channelConfig[ch].label
              return (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', channel === ch ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView('kanban')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <LayoutGrid size={13} /> Kanban
            </button>
            <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <CalendarDays size={13} /> Kalender
            </button>
            <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <List size={13} /> Lijst
            </button>
          </div>

          {/* New post */}
          <button onClick={() => openNew('idea')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#6366F1' }}>
            <Plus size={16} /> Nieuwe post
          </button>
        </div>
      </div>

      {/* Calendar nav (only in calendar view) */}
      {view === 'calendar' && (
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <h2 className="font-semibold text-slate-900 w-36 text-center">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanView />
      ) : view === 'calendar' ? (
        <CalendarView />
      ) : (
        <ListView />
      )}

      {showModal && (
        <PostModal
          post={editingPost}
          onClose={() => { setShowModal(false); setEditingPost(undefined) }}
          onSave={handleSave}
          onDelete={editingPost?.id ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
