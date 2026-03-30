'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Post } from '@/lib/supabase'

interface PostModalProps {
  post?: Partial<Post>
  onClose: () => void
  onSave: (post: Partial<Post>) => void
  onDelete?: (id: string) => void
}

const statusOptions = [
  { value: 'idea', label: 'Idee' },
  { value: 'concept', label: 'Concept' },
  { value: 'review', label: 'Review' },
  { value: 'scheduled', label: 'Gepland' },
  { value: 'live', label: 'Live' },
]

const channelOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'E-mail' },
]

export default function PostModal({ post, onClose, onSave, onDelete }: PostModalProps) {
  const [form, setForm] = useState<Partial<Post>>({
    title: '',
    content: '',
    channel: 'linkedin',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'idea',
    tags: [],
    ...post,
  })
  const [tagInput, setTagInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }))
  }

  const contentLength = (form.content || '').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60">
          <h2 className="font-semibold text-slate-900 text-lg">
            {post?.id ? 'Post bewerken' : 'Nieuwe post'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Titel</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/30 focus:border-brand"
              placeholder="Geef je post een titel..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Kanaal</label>
              <select
                value={form.channel}
                onChange={e => setForm(prev => ({ ...prev, channel: e.target.value as Post['channel'] }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {channelOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Post['status'] }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {statusOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Publicatiedatum</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={e => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">Content</label>
              {form.channel === 'linkedin' && (
                <span className={`text-xs ${contentLength > 2800 ? 'text-red-500' : 'text-slate-400'}`}>
                  {contentLength} / 3000
                </span>
              )}
            </div>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              maxLength={form.channel === 'linkedin' ? 3000 : undefined}
              rows={6}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              placeholder="Schrijf je post content hier..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags || []).map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-brand-light text-brand rounded-full text-xs">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Tag toevoegen (Enter)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {onDelete && form.id && (
              <button
                type="button"
                onClick={() => { if (confirm('Post verwijderen?')) onDelete(form.id!) }}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Verwijder
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-brand hover:opacity-90"
            >
              Opslaan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
