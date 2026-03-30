import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const maxDuration = 30

function parseDate(raw: string): string | null {
  // LinkedIn geeft datums als "MM/DD/YYYY"
  if (!raw || typeof raw !== 'string') return null
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return null
  const [month, day, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function num(val: unknown): number {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? 0 : n
}

type ImportRow = {
  date: string
  impressions?: number
  clicks?: number
  reactions?: number
  comments?: number
  shares?: number
  engagement_rate?: number
  new_followers?: number
  total_followers?: number
  page_views?: number
  unique_visitors?: number
}

function parseContent(sheet: XLSX.WorkSheet): ImportRow[] {
  // Sheet "Statistieken" — dagelijkse geaggregeerde content stats
  // Row 0 = beschrijving, Row 1 = headers, Row 2+ = data
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
  const dataRows = rows.slice(2) // sla beschrijving + header over

  return dataRows
    .map((row) => {
      const date = parseDate(row[0])
      if (!date) return null
      return {
        date,
        impressions: Math.round(num(row[3])),      // Weergaven (totaal)
        clicks: Math.round(num(row[7])),            // Klikken (totaal)
        reactions: Math.round(num(row[10])),        // Reacties (totaal)
        comments: Math.round(num(row[13])),         // Commentaren (totaal)
        shares: Math.round(num(row[16])),           // Reposts (totaal)
        engagement_rate: Math.round(num(row[19]) * 100) / 100, // Interactiepercentage (totaal)
      }
    })
    .filter(Boolean) as ImportRow[]
}

function parseFollowers(sheet: XLSX.WorkSheet): ImportRow[] {
  // Sheet "Nieuwe volgers" — Datum, Gesponsord, Spontaan, Auto, Totaal
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
  const dataRows = rows.slice(1) // sla alleen header over

  return dataRows
    .map((row) => {
      const date = parseDate(row[0])
      if (!date) return null
      return {
        date,
        new_followers: Math.round(num(row[2])),    // Spontane volgers
        total_followers: Math.round(num(row[4])),  // Totaal aantal volgers (cumulatief)
      }
    })
    .filter(Boolean) as ImportRow[]
}

function parseVisitors(sheet: XLSX.WorkSheet): ImportRow[] {
  // Sheet "Statistieken over bezoekers"
  // Col 21 = Totaal paginaweergaven (totaal), Col 24 = Totaal unieke bezoekers (totaal)
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
  const dataRows = rows.slice(1) // sla header over

  return dataRows
    .map((row) => {
      const date = parseDate(row[0])
      if (!date) return null
      return {
        date,
        page_views: Math.round(num(row[21])),       // Totaal paginaweergaven (totaal)
        unique_visitors: Math.round(num(row[24])),  // Totaal unieke bezoekers (totaal)
      }
    })
    .filter(Boolean) as ImportRow[]
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return Response.json({ error: 'Geen bestand ontvangen' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    let rows: ImportRow[] = []
    let fileType = 'onbekend'

    if (fileName.includes('content')) {
      const sheet = workbook.Sheets['Statistieken']
      if (!sheet) return Response.json({ error: 'Sheet "Statistieken" niet gevonden in content bestand' }, { status: 400 })
      rows = parseContent(sheet)
      fileType = 'content'
    } else if (fileName.includes('followers')) {
      const sheet = workbook.Sheets['Nieuwe volgers']
      if (!sheet) return Response.json({ error: 'Sheet "Nieuwe volgers" niet gevonden' }, { status: 400 })
      rows = parseFollowers(sheet)
      fileType = 'followers'
    } else if (fileName.includes('visitors')) {
      const sheet = workbook.Sheets['Statistieken over bezoekers']
      if (!sheet) return Response.json({ error: 'Sheet "Statistieken over bezoekers" niet gevonden' }, { status: 400 })
      rows = parseVisitors(sheet)
      fileType = 'visitors'
    } else {
      return Response.json({
        error: 'Bestandsnaam niet herkend. Zorg dat de naam "content", "followers" of "visitors" bevat.',
      }, { status: 400 })
    }

    // Filter rijen met alleen nullen eruit
    const validRows = rows.filter((r) => {
      const vals = Object.entries(r).filter(([k]) => k !== 'date').map(([, v]) => v as number)
      return vals.some((v) => v > 0)
    })

    if (validRows.length === 0) {
      return Response.json({ error: 'Geen geldige data gevonden in het bestand' }, { status: 400 })
    }

    // Supabase upsert — bij conflict op datum wordt de rij bijgewerkt
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { error } = await supabase
      .from('linkedin_analytics')
      .upsert(validRows, { onConflict: 'date' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
    }

    return Response.json({
      success: true,
      fileType,
      rowsImported: validRows.length,
      dateRange: {
        from: validRows[0]?.date,
        to: validRows[validRows.length - 1]?.date,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Import fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
