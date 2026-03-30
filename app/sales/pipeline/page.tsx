'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import {
  Plus,
  Search,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Building2,
  User,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Lead, PipelineStage } from '@/lib/supabase'
import LeadCard from '@/components/sales/LeadCard'
import LeadDetailPanel from '@/components/sales/LeadDetailPanel'

/* ──────────────────────── Droppable Column Wrapper ──────────────────────── */
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[200px] transition-colors rounded-lg ${isOver ? 'bg-brand/5' : ''}`}
    >
      {children}
    </div>
  )
}

/* ──────────────────────── Source filter config ──────────────────────── */
const sourceFilters = [
  { value: 'all', label: 'Alle' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'direct', label: 'Direct' },
  { value: 'other', label: 'Anders' },
]

/* ──────────────────────── New Lead Modal ──────────────────────── */
function NewLeadModal({
  stages,
  onClose,
  onCreated,
}: {
  stages: PipelineStage[]
  onClose: () => void
  onCreated: (lead: Lead) => void
}) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    source: 'direct',
    estimated_value: 0,
    priority: 'medium',
    stage_id: stages[0]?.id || '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.name.trim() && !form.company.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('leads')
      .insert({
        name: form.name || form.company,
        company: form.company,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        source: form.source,
        estimated_value: form.estimated_value,
        priority: form.priority,
        stage_id: form.stage_id,
        status: 'new',
        notes: form.notes,
      })
      .select()
      .single()
    setSaving(false)
    if (data) {
      onCreated(data as Lead)
      onClose()
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all'
  const labelClass = 'text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Nieuwe Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Naam</label>
              <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Naam lead" />
            </div>
            <div>
              <label className={labelClass}>Bedrijf</label>
              <input className={inputClass} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Bedrijfsnaam" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contactpersoon</label>
              <input className={inputClass} value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Bron</label>
              <select className={inputClass} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                <option value="linkedin">LinkedIn</option>
                <option value="website">Website</option>
                <option value="direct">Direct</option>
                <option value="other">Anders</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Waarde (€)</label>
              <input className={inputClass} type="number" value={form.estimated_value || ''} onChange={e => setForm(p => ({ ...p, estimated_value: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelClass}>Prioriteit</label>
              <select className={inputClass} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">Laag</option>
                <option value="medium">Gemiddeld</option>
                <option value="high">Hoog</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Stage</label>
            <select className={inputClass} value={form.stage_id} onChange={e => setForm(p => ({ ...p, stage_id: e.target.value }))}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notities</label>
            <textarea className={`${inputClass} h-16 resize-none`} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
            Annuleren
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Opslaan...' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────── Main Pipeline Page ──────────────────────── */
export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<{ leadId: string; fromStageId: string; fromStatus: string }[]>([])

  // Undo met Ctrl+Z / Cmd+Z
  const handleUndo = useCallback(async () => {
    setUndoStack(prev => {
      const last = prev[prev.length - 1]
      if (!last) return prev

      // Optimistic UI update
      setLeads(l => l.map(lead =>
        lead.id === last.leadId
          ? { ...lead, stage_id: last.fromStageId, status: last.fromStatus as Lead['status'] }
          : lead
      ))

      // Supabase update
      supabase
        .from('leads')
        .update({ stage_id: last.fromStageId, status: last.fromStatus })
        .eq('id', last.leadId)
        .then(() => {
          supabase.from('lead_activities').insert({
            lead_id: last.leadId,
            type: 'status_change',
            description: 'Stage teruggedraaid (undo)',
          })
        })

      return prev.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [stagesRes, leadsRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('position'),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
    ])
    if (stagesRes.data) setStages(stagesRes.data as PipelineStage[])
    if (leadsRes.data) setLeads(leadsRes.data as Lead[])
    setLoading(false)
  }

  // Filtered leads
  const filtered = useMemo(() =>
    leads.filter(l => {
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.contact_person?.toLowerCase().includes(q)
        )
      }
      return true
    }),
    [leads, search, sourceFilter]
  )

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    stages.forEach(s => (map[s.id] = []))
    filtered.forEach(l => {
      if (l.stage_id && map[l.stage_id]) {
        map[l.stage_id].push(l)
      } else if (stages[0]) {
        // Leads without stage go to first column
        map[stages[0].id]?.push(l)
      }
    })
    return map
  }, [filtered, stages])

  // KPIs
  const kpis = useMemo(() => {
    const active = leads.filter(l => {
      const stage = stages.find(s => s.id === l.stage_id)
      return stage && stage.name !== 'Gewonnen' && stage.name !== 'Verloren'
    })
    const won = leads.filter(l => {
      const stage = stages.find(s => s.id === l.stage_id)
      return stage?.name === 'Gewonnen'
    })
    return {
      total: leads.length,
      activeValue: active.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
      wonValue: won.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
      conversionRate: leads.length > 0 ? Math.round((won.length / leads.length) * 100) : 0,
    }
  }, [leads, stages])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

  /* ──── Helper: find which stage a lead or column id belongs to ──── */
  const findStageId = (id: string): string | null => {
    // Direct stage id?
    if (stages.find(s => s.id === id)) return id
    // It's a lead id — find which stage it's in
    const lead = leads.find(l => l.id === id)
    return lead?.stage_id || null
  }

  /* ──── Drag handlers ──── */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    // Resolve the target stage (could be dropped on a column OR on another card)
    const newStageId = findStageId(over.id as string)
    if (!newStageId || lead.stage_id === newStageId) return

    // Save to undo stack before changing
    const oldStageId = lead.stage_id || ''
    const oldStatus = lead.status
    setUndoStack(prev => [...prev.slice(-19), { leadId, fromStageId: oldStageId, fromStatus: oldStatus }])

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: newStageId } : l))

    // Determine new status based on stage name
    const newStage = stages.find(s => s.id === newStageId)
    let newStatus = lead.status
    if (newStage?.name === 'Gewonnen') newStatus = 'won'
    else if (newStage?.name === 'Verloren') newStatus = 'lost'
    else if (newStage?.name === 'Nieuw Lead') newStatus = 'new'
    else newStatus = 'qualified'

    await supabase
      .from('leads')
      .update({ stage_id: newStageId, status: newStatus })
      .eq('id', leadId)

    // Log activity
    const oldStage = stages.find(s => s.id === lead.stage_id)
    if (oldStage && newStage) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'status_change',
        description: `Stage gewijzigd: ${oldStage.name} → ${newStage.name}`,
      })
    }
  }

  const handleDragOver = () => {
    // Visual feedback is handled by DroppableColumn isOver highlight
  }

  const handleLeadCreated = (lead: Lead) => {
    setLeads(prev => [lead, ...prev])
  }

  const handleLeadUpdate = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLead(updated)
  }

  const handleLeadDelete = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
    setSelectedLead(null)
  }

  const activeLead = leads.find(l => l.id === activeId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Totaal Leads', value: kpis.total, icon: Users, color: '#3b82f6' },
          { label: 'Pipeline Waarde', value: formatCurrency(kpis.activeValue), icon: TrendingUp, color: '#8b5cf6' },
          { label: 'Gewonnen', value: formatCurrency(kpis.wonValue), icon: DollarSign, color: '#10b981' },
          { label: 'Conversie', value: `${kpis.conversionRate}%`, icon: Target, color: '#f97316' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + '12' }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand hover:opacity-90 transition-opacity shadow-sm shadow-brand/20"
          >
            <Plus size={16} />
            Nieuwe Lead
          </button>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {sourceFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setSourceFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sourceFilter === f.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Zoek lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-56 transition-all"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 340px)' }}>
          {stages.map(stage => {
            const stageLeads = leadsByStage[stage.id] || []
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0)

            return (
              <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold text-slate-900">{stage.name}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                      {stageLeads.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <span className="text-xs text-slate-500 font-medium">
                      {formatCurrency(stageValue)}
                    </span>
                  )}
                </div>

                {/* Column Body */}
                <DroppableColumn id={stage.id}>
                  <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2.5 min-h-[100px] rounded-xl bg-slate-50/80 border border-slate-100 p-2.5">
                      {stageLeads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={setSelectedLead}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                          Sleep leads hierheen
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeLead ? (
            <div className="bg-white rounded-lg border border-brand shadow-xl p-3.5 w-72 opacity-90 rotate-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Building2 size={14} className="text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{activeLead.company || activeLead.name}</p>
              </div>
              {activeLead.estimated_value > 0 && (
                <p className="text-base font-bold text-slate-900 mt-2">{formatCurrency(activeLead.estimated_value)}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Lead Modal */}
      {showNewModal && (
        <NewLeadModal
          stages={stages}
          onClose={() => setShowNewModal(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onDelete={handleLeadDelete}
        />
      )}
    </div>
  )
}
