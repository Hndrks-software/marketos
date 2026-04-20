import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_ROWS = 5000

const recordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date moet YYYY-MM-DD zijn'),
  impressions: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  reactions: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
})

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const rl = checkRateLimit(`${getClientIP(request)}:/api/upload`, 10)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return Response.json({ error: 'Geen bestand ontvangen' }, { status: 400 })
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return Response.json({ error: 'Bestand te groot of leeg (max 5 MB)' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.trim().split(/\r?\n/)

    if (lines.length < 2) {
      return Response.json({ error: 'CSV bestand is leeg of ongeldig' }, { status: 400 })
    }
    if (lines.length - 1 > MAX_ROWS) {
      return Response.json({ error: `Te veel rijen (max ${MAX_ROWS})` }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
    const expectedHeaders = ['date', 'impressions', 'clicks', 'reactions', 'comments', 'shares']
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return Response.json({
        error: `Ontbrekende kolommen: ${missingHeaders.join(', ')}`,
        expected: expectedHeaders,
      }, { status: 400 })
    }

    const records: z.infer<typeof recordSchema>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length < expectedHeaders.length) continue

      const raw: Record<string, string | number> = {}
      headers.forEach((h, idx) => {
        raw[h] = expectedHeaders.includes(h) && h !== 'date'
          ? parseInt(values[idx], 10) || 0
          : values[idx]
      })

      const parsed = recordSchema.safeParse(raw)
      if (!parsed.success) {
        return Response.json({
          error: `Ongeldige rij ${i}: ${parsed.error.issues[0]?.message ?? 'validatiefout'}`,
        }, { status: 400 })
      }
      records.push(parsed.data)
    }

    if (records.length === 0) {
      return Response.json({ error: 'Geen geldige rijen gevonden' }, { status: 400 })
    }

    // Upsert — requires the linkedin_analytics_date_unique constraint from linkedin_schema_update.sql
    const { error } = await auth.supabase
      .from('linkedin_analytics')
      .upsert(records, { onConflict: 'date' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return Response.json({ error: `Database fout: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, count: records.length })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Verwerking mislukt' }, { status: 500 })
  }
}
