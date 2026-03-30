import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { JWT } from 'google-auth-library'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

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

async function getGA4Data(): Promise<string> {
  try {
    const { email, key } = getCredentials()
    if (!email || !key || !propertyId) return 'GA4 niet beschikbaar'

    const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
    const token = await auth.getAccessToken()
    if (!token.token) return 'GA4 authenticatie mislukt'

    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0]
    const headers = { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`

    // Channels + bounce + duration (30 days vs previous 30)
    const [channelRes, pagesRes] = await Promise.all([
      fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          dateRanges: [
            { startDate: daysAgo(30), endDate: 'today' },
            { startDate: daysAgo(60), endDate: daysAgo(30) },
          ],
          metrics: [
            { name: 'sessions' }, { name: 'bounceRate' },
            { name: 'averageSessionDuration' }, { name: 'newUsers' },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 8,
        }),
      }),
      fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
          metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
          dimensions: [{ name: 'pagePath' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        }),
      }),
    ])

    const channelData = await channelRes.json()
    const pagesData = await pagesRes.json()

    type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }

    const channelLines = (channelData.rows || []).map((r: Row) => {
      const ch = r.dimensionValues?.[0]?.value || '?'
      const sessions = r.metricValues?.[0]?.value || '0'
      const bounce = ((parseFloat(r.metricValues?.[1]?.value || '0')) * 100).toFixed(0)
      const dur = parseFloat(r.metricValues?.[2]?.value || '0')
      return `${ch}: ${sessions} sessies, ${bounce}% bounce, ${Math.floor(dur / 60)}m${Math.floor(dur % 60)}s gem.`
    })

    const pageLines = (pagesData.rows || []).map((r: Row) => {
      const page = r.dimensionValues?.[0]?.value || '?'
      const sessions = r.metricValues?.[0]?.value || '0'
      const bounce = ((parseFloat(r.metricValues?.[1]?.value || '0')) * 100).toFixed(0)
      return `${page}: ${sessions} sessies, ${bounce}% bounce`
    })

    return [
      'WEBSITE KANALEN (30 dagen):',
      ...channelLines,
      '',
      'TOP PAGINAS:',
      ...pageLines,
    ].join('\n')
  } catch {
    return 'GA4 ophalen mislukt'
  }
}

async function getLinkedInData(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString().split('T')[0]
    const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000).toISOString().split('T')[0]

    const [thisRes, prevRes, postsRes, leadsRes] = await Promise.all([
      supabase.from('linkedin_analytics')
        .select('impressions,clicks,reactions,comments,shares,new_followers,engagement_rate,date')
        .gte('date', fourWeeksAgo).order('date', { ascending: false }),
      supabase.from('linkedin_analytics')
        .select('impressions,clicks,reactions')
        .gte('date', eightWeeksAgo).lte('date', fourWeeksAgo),
      supabase.from('linkedin_posts')
        .select('post_title,views,clicks,reactions,comments,reposts,engagement_rate,content_type,published_date')
        .order('views', { ascending: false }).limit(20),
      supabase.from('leads').select('name,company,source,status,created_at')
        .order('created_at', { ascending: false }).limit(20),
    ])

    type AnalyticsRow = { impressions?: number; clicks?: number; reactions?: number; comments?: number; shares?: number; new_followers?: number; engagement_rate?: number }
    const thisWeeks = (thisRes.data || []) as AnalyticsRow[]
    const prevWeeks = (prevRes.data || []) as AnalyticsRow[]

    const sum = (arr: AnalyticsRow[], k: keyof AnalyticsRow) => arr.reduce((s, r) => s + (Number(r[k]) || 0), 0)

    const impressNow = sum(thisWeeks, 'impressions')
    const impressPrev = sum(prevWeeks, 'impressions')
    const impressChange = impressPrev > 0 ? Math.round(((impressNow - impressPrev) / impressPrev) * 100) : 0
    const clicksNow = sum(thisWeeks, 'clicks')
    const reactionsNow = sum(thisWeeks, 'reactions')
    const followersGained = sum(thisWeeks, 'new_followers')

    type PostRow = { post_title?: string; views?: number; clicks?: number; reactions?: number; comments?: number; reposts?: number; engagement_rate?: number; content_type?: string; published_date?: string }
    const posts = (postsRes.data || []) as PostRow[]
    const postLines = posts.slice(0, 10).map((p, i) =>
      `${i + 1}. "${(p.post_title || '').slice(0, 60)}" — ${p.views || 0} views, ${p.reactions || 0} reacties, ${((p.engagement_rate || 0) * 100).toFixed(1)}% engagement, type: ${p.content_type || 'onbekend'}, datum: ${p.published_date || '?'}`
    )

    // Best day analysis
    type DayRow = { date?: string; impressions?: number }
    const dayPerf: Record<string, number[]> = {}
    for (const row of (thisRes.data || []) as DayRow[]) {
      if (!row.date) continue
      const dayName = new Date(row.date + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'long' })
      if (!dayPerf[dayName]) dayPerf[dayName] = []
      dayPerf[dayName].push(row.impressions || 0)
    }
    const dayAvg = Object.entries(dayPerf).map(([day, vals]) => ({
      day, avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    })).sort((a, b) => b.avg - a.avg)

    type LeadRow = { name?: string; company?: string; source?: string; status?: string; created_at?: string }
    const leads = (leadsRes.data || []) as LeadRow[]
    const newLeadsCount = leads.filter(l => {
      const d = new Date(l.created_at || '')
      return d.getTime() > now.getTime() - 7 * 86400000
    }).length

    // Content type analysis
    const typePerf: Record<string, { views: number; count: number }> = {}
    for (const p of posts) {
      const type = p.content_type || 'Onbekend'
      if (!typePerf[type]) typePerf[type] = { views: 0, count: 0 }
      typePerf[type].views += p.views || 0
      typePerf[type].count++
    }
    const typeLines = Object.entries(typePerf).map(([type, data]) =>
      `${type}: ${data.count} posts, gem. ${Math.round(data.views / data.count)} views`
    )

    return [
      `LINKEDIN OVERZICHT (4 weken):`,
      `Impressies: ${impressNow.toLocaleString('nl')} (${impressChange >= 0 ? '+' : ''}${impressChange}% vs vorige 4 weken)`,
      `Klikken: ${clicksNow}, Reacties: ${reactionsNow}, Nieuwe volgers: ${followersGained}`,
      `CTR: ${impressNow > 0 ? ((clicksNow / impressNow) * 100).toFixed(2) : '0'}%`,
      '',
      'CONTENT TYPE PRESTATIES:',
      ...typeLines,
      '',
      `BESTE DAG OM TE POSTEN: ${dayAvg[0]?.day || 'onbekend'} (gem. ${Math.round(dayAvg[0]?.avg || 0)} impressies)`,
      `Slechtste dag: ${dayAvg[dayAvg.length - 1]?.day || 'onbekend'} (gem. ${Math.round(dayAvg[dayAvg.length - 1]?.avg || 0)} impressies)`,
      '',
      'TOP 10 POSTS:',
      ...postLines,
      '',
      `LEADS: ${leads.length} totaal, ${newLeadsCount} nieuw deze week`,
    ].join('\n')
  } catch (e) {
    return `LinkedIn data fout: ${e instanceof Error ? e.message : 'onbekend'}`
  }
}

export async function POST(request: Request) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const rl = checkRateLimit(`${getClientIP(request)}:/api/insights`, 20)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const body = await request.json().catch(() => ({}))
    const page = (body as { page?: string }).page || 'dashboard'
    const validPages = ['dashboard', 'linkedin', 'website']
    if (!validPages.includes(page)) {
      return Response.json({ error: 'Ongeldige pagina' }, { status: 400 })
    }

    const [ga4Data, linkedInData] = await Promise.all([getGA4Data(), getLinkedInData()])

    const systemPrompts: Record<string, string> = {
      dashboard: `Je bent de AI-marketingadviseur van Collo-X (B2B machinebouwer, logistiek/farmaceutisch).
Je analyseert de marketingdata en geeft een WEKELIJKSE ANALYSE met concrete acties.

ALLE BESCHIKBARE DATA:
${ga4Data}

${linkedInData}

Geef je antwoord als JSON met exact dit formaat:
{
  "summary": "2-3 zinnen over hoe het deze periode gaat — benoem specifieke cijfers en trends",
  "alerts": [
    { "message": "Opvallende trend of waarschuwing", "type": "positive" of "warning" }
  ],
  "actions": [
    {
      "title": "Korte actietitel",
      "description": "Waarom dit belangrijk is + concrete eerste stap",
      "priority": "high" of "medium" of "low",
      "category": "linkedin" of "website" of "leads" of "content"
    }
  ],
  "bestDayToPost": "dinsdag",
  "bestContentType": "Video"
}

REGELS:
- Geef exact 3 acties — concreet en uitvoerbaar deze week
- Alerts: max 2, alleen als er iets opvalt (grote stijging/daling, kans, probleem)
- Refereer naar ECHTE data (geen generieke tips)
- Schrijf in het Nederlands, zakelijk maar toegankelijk
- Geef ALLEEN JSON terug, geen extra tekst`,

      linkedin: `Je bent de LinkedIn-marketingadviseur van Collo-X.
Analyseer deze LinkedIn data en geef een korte samenvatting:

${linkedInData}

Geef JSON terug:
{
  "insight": "2-3 zinnen samenvatting: wat gaat goed, wat kan beter, welk content type werkt best",
  "bestDayToPost": "dag van de week",
  "bestContentType": "Video/Tekst/Afbeelding",
  "tip": "1 concrete tip voor volgende week"
}
ALLEEN JSON, geen extra tekst. Nederlands.`,

      website: `Je bent de website-analist van Collo-X.
Analyseer deze GA4 data en geef een korte samenvatting:

${ga4Data}

Geef JSON terug:
{
  "insight": "2-3 zinnen: belangrijkste bevinding over traffic, bounce rate, of pagina-prestaties",
  "problemPage": { "path": "/pagina", "issue": "waarom dit een probleem is", "fix": "concrete suggestie" },
  "tip": "1 concrete tip om meer traffic te krijgen"
}
ALLEEN JSON, geen extra tekst. Nederlands.`,
    }

    const prompt = systemPrompts[page] || systemPrompts.dashboard

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    let rawText = ''
    for (const block of response.content) {
      if (block.type === 'text') rawText += block.text
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Kon geen analyse genereren' }, { status: 500 })
    }

    const insights = JSON.parse(jsonMatch[0])
    return Response.json({ ...insights, generatedAt: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Insights API fout:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
