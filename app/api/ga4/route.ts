import { JWT } from 'google-auth-library'

const propertyId = process.env.GA4_PROPERTY_ID || ''
const clientEmail = process.env.GA4_CLIENT_EMAIL || ''
const privateKey = (process.env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n')

async function getAccessToken(): Promise<string> {
  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })
  const token = await auth.getAccessToken()
  return token.token || ''
}

async function runReport(token: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return res.json()
}

export async function GET() {
  if (!propertyId || !clientEmail || !process.env.GA4_PRIVATE_KEY) {
    return Response.json({ error: 'GA4 environment variables niet ingesteld' }, { status: 500 })
  }

  try {
    const token = await getAccessToken()

    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    const daysAgo = (n: number) => formatDate(new Date(today.getTime() - n * 24 * 60 * 60 * 1000))

    // Alle rapporten parallel ophalen
    const [sessionsData, topPagesData, sourcesData, monthData] = await Promise.all([
      // Sessies per dag (14 dagen)
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(14), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),

      // Top pagina's (30 dagen)
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 7,
      }),

      // Verkeersbronnen (30 dagen)
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),

      // Totalen: deze 30 dagen vs vorige 30 dagen
      runReport(token, {
        dateRanges: [
          { startDate: daysAgo(30), endDate: 'today' },
          { startDate: daysAgo(60), endDate: daysAgo(30) },
        ],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
      }),
    ])

    // Sessies per dag
    const dailySessions = (sessionsData.rows || []).map((row: { dimensionValues: { value: string }[], metricValues: { value: string }[] }) => {
      const dateStr = row.dimensionValues?.[0]?.value || ''
      const formatted = dateStr.length === 8
        ? `${dateStr.slice(6)}/${dateStr.slice(4, 6)}`
        : dateStr
      return { date: formatted, visitors: parseInt(row.metricValues?.[0]?.value || '0') }
    })

    // Top pagina's
    const topPages = (topPagesData.rows || []).map((row: { dimensionValues: { value: string }[], metricValues: { value: string }[] }) => {
      const dur = parseFloat(row.metricValues?.[2]?.value || '0')
      const mins = Math.floor(dur / 60)
      const secs = Math.floor(dur % 60)
      return {
        page: row.dimensionValues?.[0]?.value || '/',
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
        bounce: `${(parseFloat(row.metricValues?.[1]?.value || '0') * 100).toFixed(0)}%`,
        duration: `${mins}:${String(secs).padStart(2, '0')}`,
      }
    })

    // Verkeersbronnen
    const sourceColors: Record<string, string> = {
      'Organic Search': '#6366F1', 'Organic Social': '#8B5CF6',
      'Direct': '#A78BFA', 'Email': '#C4B5FD',
      'Paid Search': '#DDD6FE', 'Referral': '#818CF8',
    }
    const sourceLabels: Record<string, string> = {
      'Organic Search': 'Organisch', 'Organic Social': 'Sociaal',
      'Direct': 'Direct', 'Email': 'E-mail',
      'Paid Search': 'Betaald', 'Referral': 'Referral',
    }
    const totalSourceSessions = (sourcesData.rows || []).reduce(
      (s: number, r: { metricValues: { value: string }[] }) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const trafficSources = (sourcesData.rows || []).map((row: { dimensionValues: { value: string }[], metricValues: { value: string }[] }) => {
      const key = row.dimensionValues?.[0]?.value || 'Direct'
      const sessions = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: sourceLabels[key] || key,
        value: totalSourceSessions > 0 ? Math.round((sessions / totalSourceSessions) * 100) : 0,
        color: sourceColors[key] || '#94a3b8',
      }
    })

    // Maandtotalen
    const rows = monthData.rows || []
    const totalSessions = parseInt(rows[0]?.metricValues?.[0]?.value || '0')
    const lastMonthSessions = parseInt(rows[1]?.metricValues?.[0]?.value || '0')
    const sessionsChange = lastMonthSessions > 0
      ? Math.round(((totalSessions - lastMonthSessions) / lastMonthSessions) * 100)
      : 0
    const bounceRate = (parseFloat(rows[0]?.metricValues?.[1]?.value || '0') * 100).toFixed(1)
    const avgDur = parseFloat(rows[0]?.metricValues?.[2]?.value || '0')
    const avgMins = Math.floor(avgDur / 60)
    const avgSecs = Math.floor(avgDur % 60)
    const avgDuration = `${avgMins}:${String(avgSecs).padStart(2, '0')}`

    return Response.json({
      dailySessions,
      topPages,
      trafficSources,
      totalSessions,
      sessionsChange,
      bounceRate,
      avgDuration,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('GA4 fout:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
