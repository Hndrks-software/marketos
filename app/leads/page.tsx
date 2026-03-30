'use client'

import { useState, useEffect } from 'react'
import { Plus, ArrowUpDown, X, Loader2 } from 'lucide-react'
import { Lead, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const statusConfig = {
  new: { label: 'Nieuw', color: '#3b82f6', bg: '#eff6ff' },
  qualified: { label: 'Gekwalificeerd', color: '#8b5cf6', bg: '#f5f3ff' },
  won: { label: 'Gewonnen', color: '#10b981', bg: '#ecfdf5' },
  lost: { label: 'Verloren', color: '#ef4444', bg: '#fef2f2' },
}

const sourceLabel: Record<string, string> = {
  linkedin: 'LinkedIn',
  website: 'Website',
  direct: 'Direct',
  other: 'Overig',
}

interface LeadFormData {
  name: string
  company: string
  source: string
  status: Lead['status']
  estimated_value: string
  notes: string
}

const emptyForm: LeadFormData = {
  name: '',
  company: '',
  source: 'linkedin',
  status: 'new',
  estimated_value: '',
  notes: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<LeadFormData>(emptyForm)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<keyof Lead>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLeads(data as Lead[])
    } else {
      setLeads([])
    }
    setLoading(false)
  }

  const handleSort = (col: keyof Lead) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = leads
    .filter(l => filterStatus === 'all' || l.status === filterStatus)
    .sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy]
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + l.estimated_value, 0)
  const pipelineValue = leads.filter(l => l.status === 'qualified').reduce((s, l) => s + l.estimated_value, 0)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: form.name,
        company: form.company,
        source: form.source,
        status: form.status,
        estimated_value: parseFloat(form.estimated_value) || 0,
        notes: form.notes,
      })
      .select()
      .single()

    if (!error && data) {
      setLeads(prev => [data as Lead, ...prev])
    }
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleStatusChange = async (id: string, newStatus: Lead['status']) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totaal leads', value: leads.length.toString(), color: '#6366F1' },
          { label: 'Gekwalificeerd', value: leads.filter(l => l.status === 'qualified').length.toString(), color: '#8B5CF6' },
          { label: 'Pipeline waarde', value: `€${pipelineValue.toLocaleString('nl-NL')}`, color: '#EC4899' },
          { label: 'Gewonnen (omzet)', value: `€${totalValue.toLocaleString('nl-NL')}`, color: '#10B981' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {['all', 'new', 'qualified', 'won', 'lost'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filterStatus === s ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
              style={filterStatus === s ? { backgroundColor: '#6366F1' } : {}}>
              {s === 'all' ? 'Alle' : statusConfig[s as Lead['status']]?.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
          style={{ backgroundColor: '#6366F1' }}>
          <Plus size={16} /> Nieuwe lead
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    { key: 'name', label: 'Naam' },
                    { key: 'company', label: 'Bedrijf' },
                    { key: 'source', label: 'Bron' },
                    { key: 'status', label: 'Status' },
                    { key: 'estimated_value', label: 'Waarde' },
                    { key: 'created_at', label: 'Datum' },
                  ].map(col => (
                    <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 select-none"
                      onClick={() => handleSort(col.key as keyof Lead)}>
                      <div className="flex items-center gap-1">{col.label}<ArrowUpDown size={11} className="opacity-40" /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(lead => {
                  const cfg = statusConfig[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                            {lead.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{lead.company}</td>
                      <td className="px-6 py-3 text-slate-600">{sourceLabel[lead.source] || lead.source}</td>
                      <td className="px-6 py-3">
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                          className="text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {Object.entries(statusConfig).map(([val, s]) => (
                            <option key={val} value={val}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">€{lead.estimated_value.toLocaleString('nl-NL')}</td>
                      <td className="px-6 py-3 text-slate-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-lg">Nieuwe Lead</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Naam</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Volledige naam" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Bedrijf</label>
                  <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Bedrijfsnaam" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Bron</label>
                  <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="linkedin">LinkedIn</option>
                    <option value="website">Website</option>
                    <option value="direct">Direct</option>
                    <option value="other">Overig</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Lead['status'] }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="new">Nieuw</option>
                    <option value="qualified">Gekwalificeerd</option>
                    <option value="won">Gewonnen</option>
                    <option value="lost">Verloren</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Geschatte waarde (€)</label>
                <input type="number" value={form.estimated_value} onChange={e => setForm(p => ({ ...p, estimated_value: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Notities</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Annuleren</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#6366F1' }}>Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
