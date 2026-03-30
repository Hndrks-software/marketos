import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const rl = checkRateLimit(`${getClientIP(request)}:/api/upload`, 10)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: 'Geen bestand ontvangen' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      return Response.json({ error: 'CSV bestand is leeg of ongeldig' }, { status: 400 })
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

    const records = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length < expectedHeaders.length) continue

      const record: Record<string, string | number> = {}
      headers.forEach((h, idx) => {
        record[h] = expectedHeaders.includes(h) && h !== 'date'
          ? parseInt(values[idx]) || 0
          : values[idx]
      })
      records.push(record)
    }

    // Save to Supabase if configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Delete existing data for the date range to avoid duplicates
      const dates = records.map(r => r.date as string)
      if (dates.length > 0) {
        await supabase
          .from('linkedin_analytics')
          .delete()
          .in('date', dates)
      }

      const { error } = await supabase
        .from('linkedin_analytics')
        .insert(records)

      if (error) {
        console.error('Supabase insert error:', error)
        // Still return success with data even if DB fails
      }
    }

    return Response.json({
      success: true,
      count: records.length,
      records,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Verwerking mislukt' }, { status: 500 })
  }
}
