import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { JWT } from 'google-auth-library'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 60 // Netlify: sta 60 seconden toe voor AI + websearch

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// ─── GA4 helpers ──────────────────────────────────────────────────────────────

const propertyId = process.env.GA4_PROPERTY_ID || ''

function getCredentials() {
  const base64 = process.env.GA4_SERVICE_ACCOUNT_BASE64 || ''
  if (base64) {
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    return { email: json.client_email, key: json.private_key }
  }
  return {
    email: process.env.GA4_CLIENT_EMAIL || '',
    key: (process.env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }
}

async function getGA4Summary(): Promise<string> {
  try {
    const { email, key } = getCredentials()
    if (!email || !key || !propertyId) return 'GA4 niet beschikbaar'

    const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
    const token = await auth.getAccessToken()
    if (!token.token) return 'GA4 authenticatie mislukt'

    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 86400000).toISOString().split('T')[0]

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [
            { startDate: daysAgo(30), endDate: 'today' },
            { startDate: daysAgo(60), endDate: daysAgo(30) },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'newUsers' },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        }),
      }
    )
    const data = await res.json()
    if (data.error) return `GA4 fout: ${data.error.message}`

    type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }
    const rows: Row[] = data.rows || []
    const lines = rows.map((r) => {
      const channel = r.dimensionValues?.[0]?.value || 'Onbekend'
      const sessions = r.metricValues?.[0]?.value || '0'
      const bounce = ((parseFloat(r.metricValues?.[1]?.value || '0')) * 100).toFixed(0)
      const dur = parseFloat(r.metricValues?.[2]?.value || '0')
      const durStr = `${Math.floor(dur / 60)}m${Math.floor(dur % 60)}s`
      return `${channel}: ${sessions} sessies, ${bounce}% bounce, gem. ${durStr}`
    })
    return lines.join('\n') || 'Geen GA4-data beschikbaar'
  } catch {
    return 'GA4 ophalen mislukt'
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function getSupabaseContext(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const [postsRes, leadsRes, analyticsRes] = await Promise.all([
      supabase.from('posts').select('status, engagement_rate, platform').limit(50),
      supabase.from('leads').select('source, status, score').limit(50),
      supabase
        .from('linkedin_analytics')
        .select('impressions, clicks, engagement_rate, date')
        .order('date', { ascending: false })
        .limit(30),
    ])

    const posts = postsRes.data || []
    const leads = leadsRes.data || []
    const analytics = analyticsRes.data || []

    const livePosts = posts.filter((p) => p.status === 'live')
    const avgEng = livePosts.length
      ? (livePosts.reduce((s: number, p: { engagement_rate?: number }) => s + (p.engagement_rate || 0), 0) / livePosts.length).toFixed(1)
      : '0'

    const totalImpressions = analytics.reduce((s: number, d: { impressions?: number }) => s + (d.impressions || 0), 0)
    const totalClicks = analytics.reduce((s: number, d: { clicks?: number }) => s + (d.clicks || 0), 0)
    const liClickRate = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'

    const leadSources = leads.reduce((acc: Record<string, number>, l: { source?: string }) => {
      const src = l.source || 'Onbekend'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})
    const topSource = Object.entries(leadSources).sort((a, b) => b[1] - a[1])[0]

    return [
      `LinkedIn: ${totalImpressions.toLocaleString('nl')} impressies, ${liClickRate}% CTR, gem. ${avgEng}% engagement`,
      `Content: ${posts.length} posts totaal, ${livePosts.length} gepubliceerd`,
      `Leads: ${leads.length} totaal, beste bron: ${topSource ? `${topSource[0]} (${topSource[1]}x)` : 'onbekend'}`,
    ].join('\n')
  } catch {
    return 'Supabase data niet beschikbaar'
  }
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const rl = checkRateLimit(`${getClientIP(request)}:/api/tips`, 20)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const [ga4Summary, supabaseContext] = await Promise.all([
      getGA4Summary(),
      getSupabaseContext(),
    ])

    const systemPrompt = `Je bent een B2B-marketingexpert die werkt voor Collo-X, een Nederlands bedrijf.
Je taak: geef 4 concrete, gepersonaliseerde marketingtips op basis van de bedrijfsdata én actuele trends.

BEDRIJFSDATA:
Website (GA4):
${ga4Summary}

LinkedIn & CRM:
${supabaseContext}

REGELS:
- Gebruik de webzoekfunctie om te zoeken naar actuele B2B-marketingtrends (2025-2026)
- Combineer de gevonden trends met de bedrijfsdata voor hyperrelevante tips
- Geef ALTIJD precies 4 tips terug als JSON-array
- Elke tip heeft: title (kort), description (2-3 zinnen actiegericht), category, impact ("Hoog"/"Medium"/"Laag"), timeframe ("Snel (< 1 week)"/"Middellang (1-4 weken)"/"Lang (> 1 maand)")
- Schrijf in het Nederlands, zakelijk maar toegankelijk
- Baseer aanbevelingen op de werkelijke data (benoem specifieke cijfers als dat helpt)

CATEGORIEËN beschikbaar: "SEO & Content", "LinkedIn", "Lead Generation", "Website Optimalisatie", "Email Marketing", "Social Media"

Geef ALLEEN de JSON-array terug, geen extra tekst.`

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      tools: [
        { type: 'web_search_20260209', name: 'web_search' },
      ],
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Zoek naar de nieuwste B2B-marketingtrends van 2025-2026 en geef me 4 gepersonaliseerde marketingtips voor Collo-X op basis van onze data en deze trends.',
        },
      ],
    })

    const finalMessage = await stream.finalMessage()

    // Extract text from content blocks
    let rawText = ''
    for (const block of finalMessage.content) {
      if (block.type === 'text') {
        rawText += block.text
      }
    }

    // Parse JSON from the response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return Response.json({ error: 'Kon geen tips genereren' }, { status: 500 })
    }

    const tips = JSON.parse(jsonMatch[0])
    return Response.json({ tips, generatedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Tips API fout:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
