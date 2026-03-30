'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, Share2, Globe, Mail, Loader2 } from 'lucide-react'
import { Post } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { mockPosts } from '@/lib/mockData'
import PostModal from '@/components/calendar/PostModal'
import { cn } from '@/lib/utils'

const statusConfig = {
  idea: { label: 'Idee', color: '#94a3b8', bg: '#f1f5f9' },
  concept: { label: 'Concept', color: '#3b82f6', bg: '#eff6ff' },
  review: { label: 'Review', color: '#f97316', bg: '#fff7ed' },
  scheduled: { label: 'Gepland', color: '#8b5cf6', bg: '#f5f3ff' },
  live: { label: 'Live', color: '#10b981', bg: '#ecfdf5' },
}

const channelIcon = {
  linkedin: <Share2 size={10} />,
  website: <Globe size={10} />,
  email: <Mail size={10} />,
}

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTHS = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<Partial<Post> | undefined>()

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('scheduled_date', { ascending: true })

    if (error || !data || data.length === 0) {
      setPosts(mockPosts as Post[])
    } else {
      setPosts(data as Post[])
    }
    setLoading(false)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7

  const days = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1
    if (d < 1 || d > lastDay.getDate()) return null
    return d
  })

  const postsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter(p => p.scheduled_date === dateStr)
  }

  const handleSave = async (postData: Partial<Post>) => {
    if (postData.id) {
      const { error } = await supabase
        .from('posts')
        .update({
          title: postData.title,
          content: postData.content,
          channel: postData.channel,
          scheduled_date: postData.scheduled_date,
          status: postData.status,
          tags: postData.tags,
        })
        .eq('id', postData.id)

      if (!error) {
        setPosts(prev => prev.map(p => p.id === postData.id ? { ...p, ...postData } as Post : p))
      }
    } else {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: postData.title || '',
          content: postData.content || '',
          channel: postData.channel || 'linkedin',
          scheduled_date: postData.scheduled_date || '',
          status: postData.status || 'idea',
          tags: postData.tags || [],
          reach: 0,
          engagement_rate: 0,
        })
        .select()
        .single()

      if (!error && data) {
        setPosts(prev => [...prev, data as Post])
      }
    }
    setShowModal(false)
    setEditingPost(undefined)
  }

  const today = new Date()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <h2 className="font-semibold text-slate-900 w-36 text-center">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 mr-2">
            {Object.entries(statusConfig).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: val.color }} />
                <span className="text-xs text-slate-500">{val.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <CalendarDays size={13} /> Kalender
            </button>
            <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <List size={13} /> Lijst
            </button>
          </div>
          <button
            onClick={() => { setEditingPost(undefined); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#6366F1' }}
          >
            <Plus size={16} /> Nieuwe post
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : view === 'calendar' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayPosts = day ? postsForDay(day) : []
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              return (
                <div key={i} className={cn('min-h-28 p-2 border-b border-r border-slate-50 last:border-r-0 hover:bg-slate-50/50 transition-colors', !day && 'bg-slate-50/30')}>
                  {day && (
                    <>
                      <span className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1', isToday ? 'text-white' : 'text-slate-600')} style={isToday ? { backgroundColor: '#6366F1' } : {}}>
                        {day}
                      </span>
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map(post => {
                          const cfg = statusConfig[post.status]
                          return (
                            <button key={post.id} onClick={() => { setEditingPost(post); setShowModal(true) }}
                              className="w-full text-left px-1.5 py-1 rounded text-xs font-medium truncate flex items-center gap-1 hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                              <span style={{ color: cfg.color }}>{channelIcon[post.channel]}</span>
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {posts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(post => {
              const cfg = statusConfig[post.status]
              return (
                <div key={post.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-20 text-xs text-slate-500 shrink-0">
                    {new Date(post.scheduled_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </div>
                  <span className="text-slate-400 shrink-0">{channelIcon[post.channel]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {post.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  {post.reach > 0 && <span className="text-xs text-slate-400 shrink-0 hidden md:block">{post.reach.toLocaleString('nl-NL')} bereik</span>}
                  <button onClick={() => { setEditingPost(post); setShowModal(true) }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0">Bewerk</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showModal && (
        <PostModal
          post={editingPost}
          onClose={() => { setShowModal(false); setEditingPost(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
