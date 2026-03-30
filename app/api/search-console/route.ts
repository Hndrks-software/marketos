import { JWT } from 'google-auth-library'

export const maxDuration = 30

const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || ''

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

async function getAccessToken(): Promise<string> {
  const { email, key } = getCredentials()
  const auth = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const token = await auth.getAccessToken()
  return token.token || ''
}

async function querySearchConsole(token: string, body: object) {
  const encoded = encodeURIComponent(siteUrl)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(`Search Console API: ${JSON.stringify(data.error)}`)
  return data
}

export async function GET() {
  try {
    if (!siteUrl) {
      return Response.json({ error: 'SEARCH_CONSOLE_SITE_URL niet ingesteld' }, { status: 500 })
    }

    const token = await getAccessToken()

    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 86400000).toISOString().split('T')[0]

    const startDate = daysAgo(90)
    const endDate = daysAgo(1) // gisteren (vandaag is nog niet volledig)

    const [keywordsData, pagesData, devicesData, trendsData] = await Promise.all([
      // Top zoekwoorden
      querySearchConsole(token, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 25,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
      // Top pagina's
      querySearchConsole(token, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 10,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
      // Apparaten
      querySearchConsole(token, {
        startDate,
        endDate,
        dimensions: ['device'],
        rowLimit: 10,
      }),
      // Trend over tijd (wekelijks)
      querySearchConsole(token, {
        startDate: daysAgo(90),
        endDate,
        dimensions: ['date'],
        rowLimit: 90,
        orderBy: [{ fieldName: 'date', sortOrder: 'ASCENDING' }],
      }),
    ])

    type SCRow = {
      keys?: string[]
      clicks?: number
      impressions?: number
      ctr?: number
      position?: number
    }

    // Zoekwoorden verwerken
    const keywords = ((keywordsData.rows || []) as SCRow[]).map(row => ({
      query: row.keys?.[0] || '',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      ctr: Math.round((row.ctr || 0) * 1000) / 10, // als percentage met 1 decimaal
      position: Math.round((row.position || 0) * 10) / 10,
    }))

    // Quick wins: positie 4-15, minimaal 10 impressies
    const quickWins = keywords
      .filter(k => k.position >= 4 && k.position <= 15 && k.impressions >= 10)
      .sort((a, b) => a.position - b.position)
      .slice(0, 5)

    // Pagina's verwerken
    const pages = ((pagesData.rows || []) as SCRow[]).map(row => {
      const url = row.keys?.[0] || ''
      // Haal alleen het pad op
      try {
        const path = new URL(url).pathname
        return {
          page: path,
          clicks: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          ctr: Math.round((row.ctr || 0) * 1000) / 10,
          position: Math.round((row.position || 0) * 10) / 10,
        }
      } catch {
        return {
          page: url,
          clicks: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          ctr: Math.round((row.ctr || 0) * 1000) / 10,
          position: Math.round((row.position || 0) * 10) / 10,
        }
      }
    })

    // Totalen
    const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0)
    const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
    const avgCtr = totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 1000) / 10
      : 0
    const avgPosition = keywords.length > 0
      ? Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length * 10) / 10
      : 0

    // Trend data (groepeer per week)
    const trendRows = (trendsData.rows || []) as SCRow[]
    const weeklyTrend: { week: string; clicks: number; impressions: number }[] = []
    for (let i = 0; i < trendRows.length; i += 7) {
      const chunk = trendRows.slice(i, i + 7)
      const clicks = chunk.reduce((s, r) => s + (r.clicks || 0), 0)
      const impressions = chunk.reduce((s, r) => s + (r.impressions || 0), 0)
      const label = chunk[0]?.keys?.[0]?.slice(5) || `W${Math.floor(i / 7) + 1}` // MM-DD
      weeklyTrend.push({ week: label, clicks: Math.round(clicks), impressions: Math.round(impressions) })
    }

    // Apparaten
    const deviceRows = (devicesData.rows || []) as SCRow[]
    const devices = deviceRows.map(row => ({
      device: row.keys?.[0] || '',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
    }))

    return Response.json({
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      keywords,
      quickWins,
      pages,
      weeklyTrend,
      devices,
      period: `${startDate} t/m ${endDate}`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Search Console fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
