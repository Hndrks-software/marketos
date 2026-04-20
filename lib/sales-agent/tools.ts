import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

// Tool definitions for Claude API
export const salesTools: Anthropic.Tool[] = [
  {
    name: 'search_leads',
    description: 'Zoek en filter leads op basis van criteria zoals naam, bedrijf, status, prioriteit, bron, of pipeline stage. Geeft een lijst van matchende leads terug.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Zoekterm voor naam of bedrijf (optioneel)' },
        status: { type: 'string', enum: ['new', 'qualified', 'lost', 'won'], description: 'Filter op lead status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter op prioriteit' },
        source: { type: 'string', enum: ['linkedin', 'website', 'direct', 'other'], description: 'Filter op bron' },
        stage_id: { type: 'string', description: 'Filter op pipeline stage ID' },
        min_value: { type: 'number', description: 'Minimum geschatte waarde in euro' },
        limit: { type: 'number', description: 'Maximum aantal resultaten (standaard 20)' },
      },
      required: [],
    },
  },
  {
    name: 'get_lead_details',
    description: 'Haal volledige details op van een specifieke lead, inclusief alle contactinfo, pipeline status, en recente activiteiten.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Het ID van de lead' },
        lead_name: { type: 'string', description: 'Naam van de lead (als ID niet bekend is)' },
      },
      required: [],
    },
  },
  {
    name: 'get_pipeline_summary',
    description: 'Haal een overzicht op van de hele sales pipeline: aantal leads per stage, totale waarde, conversieratio, en KPIs.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_upcoming_followups',
    description: 'Haal leads op die binnenkort opgevolg moeten worden, gesorteerd op next_action_date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: { type: 'number', description: 'Aantal dagen vooruit kijken (standaard 7)' },
      },
      required: [],
    },
  },
  {
    name: 'get_lead_activities',
    description: 'Haal de activiteiten-historie op van een specifieke lead (notities, calls, emails, meetings, statuswijzigingen).',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Het ID van de lead' },
        limit: { type: 'number', description: 'Maximum aantal activiteiten (standaard 20)' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'update_lead',
    description: 'Werk een lead bij. BELANGRIJK: Gebruik dit alleen als de gebruiker expliciet vraagt om een wijziging. Geef altijd aan wat je gaat wijzigen voordat je deze tool aanroept.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Het ID van de lead' },
        status: { type: 'string', enum: ['new', 'qualified', 'lost', 'won'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        notes: { type: 'string', description: 'Nieuwe notities (voegt toe aan bestaande)' },
        next_action: { type: 'string', description: 'Volgende actie' },
        next_action_date: { type: 'string', description: 'Datum voor volgende actie (YYYY-MM-DD)' },
        stage_id: { type: 'string', description: 'Pipeline stage ID' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'create_activity',
    description: 'Log een nieuwe activiteit voor een lead (notitie, telefoongesprek, email, meeting).',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Het ID van de lead' },
        type: { type: 'string', enum: ['note', 'call', 'email', 'meeting'], description: 'Type activiteit' },
        description: { type: 'string', description: 'Beschrijving van de activiteit' },
      },
      required: ['lead_id', 'type', 'description'],
    },
  },
]

// Tool handlers
export async function handleToolCall(
  supabase: SupabaseClient,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'search_leads':
      return searchLeads(supabase, input)
    case 'get_lead_details':
      return getLeadDetails(supabase, input)
    case 'get_pipeline_summary':
      return getPipelineSummary(supabase)
    case 'get_upcoming_followups':
      return getUpcomingFollowups(supabase, input)
    case 'get_lead_activities':
      return getLeadActivities(supabase, input)
    case 'update_lead':
      return updateLead(supabase, input)
    case 'create_activity':
      return createActivity(supabase, input)
    default:
      return JSON.stringify({ error: `Onbekende tool: ${name}` })
  }
}

function escapeLike(input: string): string {
  // Escape PostgREST ilike metacharacters and comma/paren that could break .or()
  return input.replace(/[%_,()]/g, (c) => `\\${c}`)
}

async function searchLeads(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  let query = supabase.from('leads').select('id, name, company, source, status, estimated_value, priority, next_action, next_action_date, stage_id, email, phone, contact_person, created_at')

  if (input.status) query = query.eq('status', input.status)
  if (input.priority) query = query.eq('priority', input.priority)
  if (input.source) query = query.eq('source', input.source)
  if (input.stage_id) query = query.eq('stage_id', input.stage_id)
  if (input.min_value) query = query.gte('estimated_value', input.min_value)
  if (typeof input.query === 'string' && input.query.length > 0) {
    const term = `%${escapeLike(input.query.slice(0, 100))}%`
    query = query.or(`name.ilike.${term},company.ilike.${term}`)
  }

  const limit = Math.min(Number(input.limit) || 20, 100)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) return JSON.stringify({ error: error.message })
  if (!data || data.length === 0) return JSON.stringify({ message: 'Geen leads gevonden met deze criteria.', results: [] })

  return JSON.stringify({ count: data.length, results: data })
}

async function getLeadDetails(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  let query = supabase.from('leads').select('*')

  if (input.lead_id) {
    query = query.eq('id', input.lead_id)
  } else if (typeof input.lead_name === 'string' && input.lead_name.length > 0) {
    query = query.ilike('name', `%${escapeLike(input.lead_name.slice(0, 100))}%`)
  } else {
    return JSON.stringify({ error: 'Geef een lead_id of lead_name op.' })
  }

  const { data: leads, error } = await query.limit(1).single()
  if (error) return JSON.stringify({ error: error.message })

  // Fetch recent activities
  const { data: activities } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leads.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch pipeline stage name
  let stageName = null
  if (leads.stage_id) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', leads.stage_id)
      .single()
    stageName = stage?.name || null
  }

  return JSON.stringify({
    lead: { ...leads, stage_name: stageName },
    recent_activities: activities || [],
  })
}

async function getPipelineSummary(supabase: SupabaseClient): Promise<string> {
  const [leadsRes, stagesRes] = await Promise.all([
    supabase.from('leads').select('id, status, estimated_value, stage_id, priority, created_at'),
    supabase.from('pipeline_stages').select('*').order('position', { ascending: true }),
  ])

  const leads = leadsRes.data || []
  const stages = stagesRes.data || []

  const totalLeads = leads.length
  const totalValue = leads.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const wonLeads = leads.filter(l => l.status === 'won')
  const wonValue = wonLeads.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const lostLeads = leads.filter(l => l.status === 'lost').length
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : '0'

  const perStage = stages.map(stage => {
    const stageLeads = leads.filter(l => l.stage_id === stage.id)
    return {
      stage: stage.name,
      count: stageLeads.length,
      value: stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
    }
  })

  const byStatus = {
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    won: wonLeads.length,
    lost: lostLeads,
  }

  const byPriority = {
    high: leads.filter(l => l.priority === 'high').length,
    medium: leads.filter(l => l.priority === 'medium').length,
    low: leads.filter(l => l.priority === 'low').length,
  }

  return JSON.stringify({
    totaal_leads: totalLeads,
    totale_pipeline_waarde: totalValue,
    gewonnen_waarde: wonValue,
    conversie_percentage: `${conversionRate}%`,
    per_stage: perStage,
    per_status: byStatus,
    per_prioriteit: byPriority,
  })
}

async function getUpcomingFollowups(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const daysAhead = (input.days_ahead as number) || 7
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data: upcoming, error: upcomingError } = await supabase
    .from('leads')
    .select('id, name, company, next_action, next_action_date, priority, status, estimated_value, stage_id')
    .not('next_action_date', 'is', null)
    .lte('next_action_date', futureDateStr)
    .order('next_action_date', { ascending: true })

  if (upcomingError) return JSON.stringify({ error: upcomingError.message })

  const overdue = (upcoming || []).filter(l => l.next_action_date && l.next_action_date < today)
  const thisWeek = (upcoming || []).filter(l => l.next_action_date && l.next_action_date >= today)

  return JSON.stringify({
    achterstallig: overdue,
    komende_dagen: thisWeek,
    totaal: (upcoming || []).length,
  })
}

async function getLeadActivities(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const limit = Math.min(Number(input.limit) || 20, 100)

  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', input.lead_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ activities: data || [], count: (data || []).length })
}

async function updateLead(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const { lead_id, ...updates } = input
  if (!lead_id) return JSON.stringify({ error: 'lead_id is verplicht' })

  const allowedFields = ['status', 'priority', 'notes', 'next_action', 'next_action_date', 'stage_id']
  const safeUpdates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      safeUpdates[key] = value
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return JSON.stringify({ error: 'Geen geldige velden om bij te werken.' })
  }

  const { data, error } = await supabase
    .from('leads')
    .update(safeUpdates)
    .eq('id', lead_id)
    .select()
    .single()

  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ success: true, updated_lead: data })
}

async function createActivity(supabase: SupabaseClient, input: Record<string, unknown>): Promise<string> {
  const { lead_id, type, description } = input

  if (!lead_id || !type || !description) {
    return JSON.stringify({ error: 'lead_id, type en description zijn verplicht.' })
  }

  const allowedTypes = ['note', 'call', 'email', 'meeting']
  if (typeof type !== 'string' || !allowedTypes.includes(type)) {
    return JSON.stringify({ error: 'Ongeldig activiteit-type.' })
  }

  const { data, error } = await supabase
    .from('lead_activities')
    .insert({ lead_id, type, description })
    .select()
    .single()

  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ success: true, activity: data })
}
