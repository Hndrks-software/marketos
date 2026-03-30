import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

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

export async function POST(request: Request) {
  try {
    const { rows, fileType } = await request.json() as { rows: ImportRow[]; fileType: string }

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Geen data ontvangen' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { error } = await supabase
      .from('linkedin_analytics')
      .upsert(rows, { onConflict: 'date' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
    }

    return Response.json({
      success: true,
      fileType,
      rowsImported: rows.length,
      dateRange: {
        from: rows[0]?.date,
        to: rows[rows.length - 1]?.date,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Import fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
