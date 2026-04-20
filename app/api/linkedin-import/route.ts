import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 30

const MAX_ROWS = 5000

const analyticsRow = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  impressions: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  reactions: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  engagement_rate: z.number().nonnegative().optional(),
  new_followers: z.number().int().optional(),
  total_followers: z.number().int().nonnegative().optional(),
  page_views: z.number().int().nonnegative().optional(),
  unique_visitors: z.number().int().nonnegative().optional(),
}).passthrough()

const postRow = z.object({
  post_url: z.string().url().max(1000),
  post_title: z.string().max(2000).optional(),
  post_type: z.string().max(100).optional(),
  content_type: z.string().max(100).optional(),
  published_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  audience: z.string().max(200).optional(),
  views: z.number().int().nonnegative().optional(),
  unique_views: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  ctr: z.number().nonnegative().optional(),
  reactions: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  reposts: z.number().int().nonnegative().optional(),
  follows: z.number().int().nonnegative().optional(),
  engagement_rate: z.number().nonnegative().optional(),
}).passthrough()

const bodySchema = z.object({
  fileType: z.enum(['content-posts', 'visitor-metrics', 'follower-metrics', 'update-metrics', 'content-metrics']),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(MAX_ROWS),
})

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const rl = checkRateLimit(`${getClientIP(request)}:/api/linkedin-import`, 10)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: `Ongeldig verzoek: ${parsed.error.issues[0]?.message ?? 'validatiefout'}`,
      }, { status: 400 })
    }

    const { rows, fileType } = parsed.data

    if (fileType === 'content-posts') {
      const cleanRows: unknown[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = postRow.safeParse(rows[i])
        if (!r.success) {
          return Response.json({ error: `Rij ${i + 1} ongeldig: ${r.error.issues[0]?.message}` }, { status: 400 })
        }
        cleanRows.push(r.data)
      }
      const { error } = await auth.supabase
        .from('linkedin_posts')
        .upsert(cleanRows, { onConflict: 'post_url' })
      if (error) {
        console.error('Supabase posts upsert error:', error)
        return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
      }
      return Response.json({ success: true, fileType, rowsImported: rows.length })
    }

    const cleanRows: unknown[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = analyticsRow.safeParse(rows[i])
      if (!r.success) {
        return Response.json({ error: `Rij ${i + 1} ongeldig: ${r.error.issues[0]?.message}` }, { status: 400 })
      }
      cleanRows.push(r.data)
    }

    const { error } = await auth.supabase
      .from('linkedin_analytics')
      .upsert(cleanRows, { onConflict: 'date' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
    }

    const first = cleanRows[0] as { date?: string }
    const last = cleanRows[cleanRows.length - 1] as { date?: string }
    return Response.json({
      success: true,
      fileType,
      rowsImported: rows.length,
      dateRange: { from: first?.date, to: last?.date },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Import fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
