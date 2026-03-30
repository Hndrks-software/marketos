'use client'

import { useState, useEffect } from 'react'
import { X, Phone, Mail, Building2, User, Calendar, MessageSquare, PhoneCall, Mail as MailIcon, Users, ArrowRightLeft, Plus, Trash2, Save } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { supabase } from '@/lib/supabase'
import type { Lead, LeadActivity, PipelineStage } from '@/lib/supabase'

const activityTypes = [
  { value: 'note', label: 'Notitie', icon: MessageSquare, color: '#64748b' },
  { value: 'call', label: 'Belnotitie', icon: PhoneCall, color: '#3b82f6' },
  { value: 'email', label: 'Email', icon: MailIcon, color: '#8b5cf6' },
  { value: 'meeting', label: 'Meeting', icon: Users, color: '#10b981' },
  { value: 'status_change', label: 'Status wijziging', icon: ArrowRightLeft, color: '#f97316' },
]

const priorityOptions = [
  { value: 'low', label: 'Laag' },
  { value: 'medium', label: 'Gemiddeld' },
  { value: 'high', label: 'Hoog' },
]

type Props = {
  lead: Lead
  stages: PipelineStage[]
  onClose: () => void
  onUpdate: (lead: Lead) => void
  onDelete: (id: string) => void
}

export default function LeadDetailPanel({ lead, stages, onClose, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState<Lead>(lead)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(lead)
    loadActivities()
  }, [lead.id])

  const loadActivities = async () => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
    if (data) setActivities(data)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data, error } = await supabase
      .from('leads')
      .update({
        name: form.name,
        company: form.company,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        source: form.source,
        estimated_value: form.estimated_value,
        priority: form.priority,
        stage_id: form.stage_id,
        next_action: form.next_action,
        next_action_date: form.next_action_date,
        notes: form.notes,
      })
      .eq('id', lead.id)
      .select()
      .single()
    setSaving(false)
    if (data) onUpdate(data as Lead)
  }

  const handleAddActivity = async () => {
    if (!newActivity.description.trim()) return
    const { data } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        type: newActivity.type,
        description: newActivity.description.trim(),
      })
      .select()
      .single()
    if (data) {
      setActivities(prev => [data as LeadActivity, ...prev])
      setNewActivity({ type: 'note', description: '' })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze lead wilt verwijderen?')) return
    await supabase.from('leads').delete().eq('id', lead.id)
    onDelete(lead.id)
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all'
  const labelClass = 'text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{form.company || form.name}</h2>
            <p className="text-xs text-slate-500">{form.contact_person || form.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Contact Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Contactgegevens</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Bedrijf</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={form.company || ''} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contactpersoon</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={form.contact_person || ''} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Telefoon</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
            </div>
          </section>

          {/* Deal Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Deal informatie</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Geschatte waarde (€)</label>
                <CurrencyInput className={inputClass} value={form.estimated_value || 0} onChange={v => setForm(p => ({ ...p, estimated_value: v }))} />
              </div>
              <div>
                <label className={labelClass}>Prioriteit</label>
                <select className={inputClass} value={form.priority || 'medium'} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Lead['priority'] }))}>
                  {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Bron</label>
                <select className={inputClass} value={form.source || ''} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  <option value="linkedin">LinkedIn</option>
                  <option value="website">Website</option>
                  <option value="direct">Direct</option>
                  <option value="other">Anders</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Stage</label>
                <select className={inputClass} value={form.stage_id || ''} onChange={e => setForm(p => ({ ...p, stage_id: e.target.value }))}>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Next Action */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Volgende actie</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <input className={inputClass} placeholder="Bijv. Follow-up bellen" value={form.next_action || ''} onChange={e => setForm(p => ({ ...p, next_action: e.target.value }))} />
              </div>
              <div>
                <input className={inputClass} type="date" value={form.next_action_date || ''} onChange={e => setForm(p => ({ ...p, next_action_date: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className={labelClass}>Notities</label>
            <textarea className={`${inputClass} h-20 resize-none`} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Vrije notities over deze lead..." />
          </section>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white gradient-brand hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
          </button>

          {/* Activity Log */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Activiteiten</h3>

            {/* Add activity */}
            <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex gap-2">
                <select
                  className="px-2 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
                  value={newActivity.type}
                  onChange={e => setNewActivity(p => ({ ...p, type: e.target.value }))}
                >
                  {activityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  className="flex-1 px-2 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                  placeholder="Beschrijving..."
                  value={newActivity.description}
                  onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                />
                <button
                  onClick={handleAddActivity}
                  className="p-1.5 rounded-md gradient-brand text-white hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {activities.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Nog geen activiteiten</p>
              )}
              {activities.map(act => {
                const typeConfig = activityTypes.find(t => t.value === act.type) || activityTypes[0]
                const Icon = typeConfig.icon
                return (
                  <div key={act.id} className="flex gap-3 items-start">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: typeConfig.color + '15', color: typeConfig.color }}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">{act.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
