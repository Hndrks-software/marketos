/**
 * Trello → MarketOS Pipeline Import Script
 *
 * Leest de Trello JSON export en importeert alle open kaarten
 * naar de Supabase leads + pipeline_stages tabellen.
 *
 * Usage: node scripts/import-trello.mjs <path-to-trello-json>
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Try loading from .env.local
  try {
    const envFile = readFileSync('.env.local', 'utf8')
    for (const line of envFile.split('\n')) {
      const [key, ...vals] = line.split('=')
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
    }
  } catch {}
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── Trello list → Pipeline stage mapping ────────────────
const listToStageMap = {
  'Potentials': 'Potentials',
  'Contacted Us': 'Contacted Us',
  'Contacted us': 'Contacted Us',
  'Leads': 'Leads',
  'Meeting': 'Meeting',
  'Contacted': 'Contacted Us',
  'Prospect': 'Prospect',
  'prospect': 'Prospect',
  'Proposal Delivered': 'Prospect',
  'Won🎉': 'Won',
  'Contact Again': 'Contact Again',
  'Lost/Not interested': 'Lost/Not Interested',
}

// ── Parse Trello card description ───────────────────────
function parseDescription(desc) {
  if (!desc) return {}

  const result = {}

  // Extract fields from markdown-style **key:** value patterns
  const patterns = [
    { key: 'contact_person', regex: /\*?\*?contactpersoon\*?\*?[:\s]+(.+)/i },
    { key: 'email', regex: /\*?\*?e-mail\*?\*?[:\s]+\[?([^\]\s\(]+@[^\]\s\)]+)/i },
    { key: 'phone', regex: /\*?\*?telefoon\*?\*?[:\s]+([+\d][\d\s\-]+\d)/i },
    { key: 'company', regex: /\*?\*?bedrijf\*?\*?[:\s]+(.+)/i },
    { key: 'location', regex: /\*?\*?locatie[_ ]levering\*?\*?[:\s]+(.+)/i },
    { key: 'project', regex: /\*?\*?projectomschrijving\*?\*?[:\s]+(.+)/im },
  ]

  for (const { key, regex } of patterns) {
    const match = desc.match(regex)
    if (match) {
      let val = match[1].trim()
      // Clean markdown links
      val = val.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown formatting
      val = val.replace(/\*\*/g, '').trim()
      // Skip "onbekend", "niet vermeld", empty
      if (val && !val.match(/^(onbekend|niet vermeld|nog onbekend|\[nog onbekend\]|-|–)$/i)) {
        result[key] = val
      }
    }
  }

  // Full description as notes (cleaned up)
  result.fullDesc = desc
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return result
}

// ── Determine status from stage name ────────────────────
function stageToStatus(stageName) {
  if (stageName === 'Won') return 'won'
  if (stageName === 'Lost/Not Interested') return 'lost'
  if (stageName === 'Potentials') return 'new'
  return 'qualified'
}

// ── Determine priority from labels ──────────────────────
function labelsToPriority(labels) {
  const names = labels.map(l => l.name?.toLowerCase() || '')
  if (names.some(n => n.includes('hot') || n.includes('urgent'))) return 'high'
  if (names.some(n => n.includes('new') || n.includes('NEW'))) return 'medium'
  return 'medium'
}

// ── Determine source from labels ────────────────────────
function labelsToSource(labels) {
  const names = labels.map(l => l.name?.toLowerCase() || '')
  if (names.some(n => n.includes('linkedin'))) return 'linkedin'
  if (names.some(n => n.includes('website'))) return 'website'
  return 'direct'
}

// ── Main import ─────────────────────────────────────────
async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node scripts/import-trello.mjs <path-to-trello-json>')
    process.exit(1)
  }

  console.log('📂 Trello export laden...')
  const data = JSON.parse(readFileSync(filePath, 'utf8'))

  // Build list ID → name map
  const listMap = {}
  for (const list of data.lists) {
    listMap[list.id] = list.name
  }

  // Load pipeline stages from Supabase
  console.log('📊 Pipeline stages ophalen...')
  const { data: stages, error: stagesErr } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('position')

  if (stagesErr || !stages?.length) {
    console.error('❌ Kan pipeline_stages niet ophalen. Heb je de SQL migratie gerund?', stagesErr)
    process.exit(1)
  }

  const stageByName = {}
  for (const s of stages) {
    stageByName[s.name] = s.id
  }

  console.log(`✅ ${stages.length} stages gevonden: ${stages.map(s => s.name).join(', ')}`)

  // Filter open cards only
  const openCards = data.cards.filter(c => !c.closed)
  console.log(`\n📋 ${openCards.length} open kaarten gevonden in ${data.lists.length} lijsten`)

  // Process each card
  const leads = []
  let skipped = 0

  for (const card of openCards) {
    const listName = listMap[card.idList]
    const stageName = listToStageMap[listName]

    if (!stageName) {
      skipped++
      continue
    }

    const stageId = stageByName[stageName]
    if (!stageId) {
      console.warn(`⚠️  Stage "${stageName}" niet gevonden voor lijst "${listName}"`)
      skipped++
      continue
    }

    const parsed = parseDescription(card.desc)
    const labels = card.labels || []

    const lead = {
      name: card.name,
      company: parsed.company || card.name,
      contact_person: parsed.contact_person || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      source: labelsToSource(labels),
      status: stageToStatus(stageName),
      stage_id: stageId,
      estimated_value: 0,
      priority: labelsToPriority(labels),
      next_action: null,
      next_action_date: card.due ? card.due.split('T')[0] : null,
      notes: parsed.fullDesc || (parsed.project ? `Projectomschrijving: ${parsed.project}` : `Geïmporteerd vanuit Trello (${listName})`),
    }

    // If card has a due date, set as next action
    if (card.due) {
      lead.next_action = 'Follow-up (vanuit Trello)'
      lead.next_action_date = card.due.split('T')[0]
    }

    leads.push(lead)
  }

  console.log(`\n📊 Klaar om ${leads.length} leads te importeren (${skipped} overgeslagen)`)

  // Show breakdown per stage
  const perStage = {}
  for (const l of leads) {
    const sn = stages.find(s => s.id === l.stage_id)?.name || '?'
    perStage[sn] = (perStage[sn] || 0) + 1
  }
  console.log('\nPer stage:')
  for (const [name, count] of Object.entries(perStage)) {
    console.log(`  ${name}: ${count}`)
  }

  // Insert in batches of 50
  console.log('\n🚀 Importeren naar Supabase...')
  let inserted = 0
  let errors = 0

  for (let i = 0; i < leads.length; i += 50) {
    const batch = leads.slice(i, i + 50)
    const { data: result, error } = await supabase
      .from('leads')
      .insert(batch)
      .select('id')

    if (error) {
      console.error(`❌ Batch ${i}-${i + batch.length} fout:`, error.message)
      errors += batch.length
    } else {
      inserted += result.length
      process.stdout.write(`  ✅ ${inserted}/${leads.length} geïmporteerd\r`)
    }
  }

  console.log(`\n\n🎉 Import voltooid!`)
  console.log(`  ✅ ${inserted} leads geïmporteerd`)
  if (errors > 0) console.log(`  ❌ ${errors} fouten`)
  console.log(`  ⏭️  ${skipped} overgeslagen (gesloten lijsten of onbekende mapping)`)
}

main().catch(err => {
  console.error('❌ Fout:', err)
  process.exit(1)
})
