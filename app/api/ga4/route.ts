import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = process.env.GA4_PROPERTY_ID || ''
const clientEmail = process.env.GA4_CLIENT_EMAIL || ''

function getPrivateKey(): string {
  const raw = process.env.GA4_PRIVATE_KEY || ''
  // Haal eventuele aanhalingstekens weg en vervang \n door echte newlines
  return raw
    .replace(/^["']|["']$/g, '')   // verwijder omringende quotes
    .replace(/\\n/g, '\n')          // vervang \n door echte newline
}

function getClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: getPrivateKey(),
    },
  })
}

export async function GET() {
  if (!propertyId || !clientEmail || !process.env.GA4_PRIVATE_KEY) {
    return Response.json({ error: 'GA4 environment variables niet ingesteld' }, { status: 500 })
  }

  try {
    const analyticsClient = getClient()
    const today = new Date()
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    // Sessies per dag (14 dagen)
    const [sessionsRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: formatDate(fourteenDaysAgo), endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    })

    // Top pagina's
    const [topPagesRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: formatDate(thirtyDaysAgo), endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 7,
    })

    // Verkeersbronnen
    const [sourcesRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: formatDate(thirtyDaysAgo), endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    })

    // Maandtotalen: deze maand vs vorige maand
    const [monthRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: formatDate(thirtyDaysAgo), endDate: 'today' },
        { startDate: formatDate(sixtyDaysAgo), endDate: formatDate(thirtyDaysAgo) },
      ],
      metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
    })

    // Verwerk sessies per dag
    const dailySessions = (sessionsRes.rows || []).map(row => {
      const dateStr = row.dimensionValues?.[0]?.value || ''
      const formatted = dateStr.length === 8
        ? `${dateStr.slice(6)}/${dateStr.slice(4, 6)}`
        : dateStr
      return {
        date: formatted,
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      }
    })

    // Verwerk top pagina's
    const topPages = (topPagesRes.rows || []).map(row => {
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

    // Verwerk verkeersbronnen
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
    const totalSourceSessions = (sourcesRes.rows || []).reduce(
      (s, r) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const trafficSources = (sourcesRes.rows || []).map(row => {
      const key = row.dimensionValues?.[0]?.value || 'Direct'
      const sessions = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: sourceLabels[key] || key,
        value: totalSourceSessions > 0 ? Math.round((sessions / totalSourceSessions) * 100) : 0,
        color: sourceColors[key] || '#94a3b8',
      }
    })

    // Maandtotalen
    const thisMonthRow = monthRes.rows?.find(r => r.dimensionValues === undefined)
    const allRows = monthRes.rows || []
    const totalSessions = allRows.length > 0 ? parseInt(allRows[0]?.metricValues?.[0]?.value || '0') : 0
    const lastMonthSessions = allRows.length > 1 ? parseInt(allRows[1]?.metricValues?.[0]?.value || '0') : 0
    void thisMonthRow

    const sessionsChange = lastMonthSessions > 0
      ? Math.round(((totalSessions - lastMonthSessions) / lastMonthSessions) * 100)
      : 0
    const bounceRate = (parseFloat(allRows[0]?.metricValues?.[1]?.value || '0') * 100).toFixed(1)
    const avgDur = parseFloat(allRows[0]?.metricValues?.[2]?.value || '0')
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
