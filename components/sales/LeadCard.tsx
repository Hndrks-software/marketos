'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, User, Phone, Calendar, ArrowRight } from 'lucide-react'
import type { Lead } from '@/lib/supabase'

const priorityConfig = {
  low: { label: 'Laag', color: '#64748b', bg: '#f1f5f9' },
  medium: { label: 'Gemiddeld', color: '#3b82f6', bg: '#eff6ff' },
  high: { label: 'Hoog', color: '#ef4444', bg: '#fef2f2' },
}

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  linkedin: { label: 'LinkedIn', color: '#0077b5', bg: '#e8f4fd' },
  website: { label: 'Website', color: '#8b5cf6', bg: '#f5f3ff' },
  direct: { label: 'Direct', color: '#10b981', bg: '#ecfdf5' },
  other: { label: 'Anders', color: '#64748b', bg: '#f1f5f9' },
}

type Props = {
  lead: Lead
  onClick: (lead: Lead) => void
}

export default function LeadCard({ lead, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priority = priorityConfig[lead.priority || 'medium']
  const source = sourceConfig[lead.source] || sourceConfig.other

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(lead)}
      className="bg-white rounded-lg border border-slate-200/80 p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Company + Value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.company || lead.name}</p>
        </div>
      </div>

      {/* Contact person */}
      {lead.contact_person && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
          <User size={12} />
          <span className="truncate">{lead.contact_person}</span>
        </div>
      )}

      {/* Value */}
      {lead.estimated_value > 0 && (
        <p className="text-base font-bold text-slate-900 mb-2">
          {formatCurrency(lead.estimated_value)}
        </p>
      )}

      {/* Next action */}
      {lead.next_action && (
        <div className="flex items-start gap-1.5 mb-2 p-2 rounded-md bg-amber-50 border border-amber-100">
          <ArrowRight size={12} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-amber-800 font-medium truncate">{lead.next_action}</p>
            {lead.next_action_date && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                <Calendar size={10} />
                {new Date(lead.next_action_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ color: source.color, backgroundColor: source.bg }}
        >
          {source.label}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ color: priority.color, backgroundColor: priority.bg }}
        >
          {priority.label}
        </span>
      </div>
    </div>
  )
}
