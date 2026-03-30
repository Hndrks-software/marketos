import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

type AnalyticsRow = {
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

type PostRow = {
  post_url: string
  post_title: string
  post_type: string
  content_type?: string
  published_date: string
  audience?: string
  views: number
  unique_views?: number
  clicks: number
  ctr?: number
  reactions: number
  comments: number
  reposts: number
  follows?: number
  engagement_rate?: number
}

export async function POST(request: Request) {
  try {
    const { rows, fileType } = await request.json() as { rows: (AnalyticsRow | PostRow)[]; fileType: string }

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Geen data ontvangen' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    if (fileType === 'content-posts') {
      const { error } = await supabase
        .from('linkedin_posts')
        .upsert(rows as PostRow[], { onConflict: 'post_url' })
      if (error) {
        console.error('Supabase posts upsert error:', error)
        return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
      }
      return Response.json({ success: true, fileType, rowsImported: rows.length })
    }

    const { error } = await supabase
      .from('linkedin_analytics')
      .upsert(rows as AnalyticsRow[], { onConflict: 'date' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
    }

    return Response.json({
      success: true,
      fileType,
      rowsImported: rows.length,
      dateRange: {
        from: (rows[0] as AnalyticsRow)?.date,
        to: (rows[rows.length - 1] as AnalyticsRow)?.date,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Import fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
