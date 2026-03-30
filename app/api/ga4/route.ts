import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = process.env.GA4_PROPERTY_ID || ''
const clientEmail = process.env.GA4_CLIENT_EMAIL || ''
const privateKey = (process.env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n')

function getClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  })
}

export async function GET() {
  try {
    const analyticsClient = getClient()
    const today = new Date()
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    // Haal meerdere rapporten tegelijk op
    const [sessionsRes, topPagesRes, sourcesRes, monthRes] = await Promise.all([
      // Sessies per dag (14 dagen)
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: formatDate(fourteenDaysAgo), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),

      // Top pagina's
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: formatDate(thirtyDaysAgo), endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 7,
      }),

      // Verkeersbronnen
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: formatDate(thirtyDaysAgo), endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),

      // Totaal deze maand
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          { startDate: formatDate(thirtyDaysAgo), endDate: 'today' },
          { startDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 2, today.getDate())), endDate: formatDate(thirtyDaysAgo) },
        ],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
      }),
    ])

    // Verwerk sessies per dag
    const dailySessions = (sessionsRes[0].rows || []).map(row => {
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
    const topPages = (topPagesRes[0].rows || []).map(row => {
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
      'Organic Search': '#6366F1',
      'Organic Social': '#8B5CF6',
      'Direct': '#A78BFA',
      'Email': '#C4B5FD',
      'Paid Search': '#DDD6FE',
      'Referral': '#818CF8',
    }
    const sourceLabels: Record<string, string> = {
      'Organic Search': 'Organisch',
      'Organic Social': 'Sociaal',
      'Direct': 'Direct',
      'Email': 'E-mail',
      'Paid Search': 'Betaald',
      'Referral': 'Referral',
    }
    const totalSourceSessions = (sourcesRes[0].rows || []).reduce(
      (s, r) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const trafficSources = (sourcesRes[0].rows || []).map(row => {
      const key = row.dimensionValues?.[0]?.value || 'Direct'
      const sessions = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: sourceLabels[key] || key,
        value: totalSourceSessions > 0 ? Math.round((sessions / totalSourceSessions) * 100) : 0,
        color: sourceColors[key] || '#94a3b8',
      }
    })

    // Verwerk maandtotalen
    const thisMonth = monthRes[0].rows?.[0]
    const lastMonth = monthRes[0].rows?.[1]
    const totalSessions = parseInt(thisMonth?.metricValues?.[0]?.value || '0')
    const lastMonthSessions = parseInt(lastMonth?.metricValues?.[0]?.value || '0')
    const sessionsChange = lastMonthSessions > 0
      ? Math.round(((totalSessions - lastMonthSessions) / lastMonthSessions) * 100)
      : 0
    const bounceRate = ((parseFloat(thisMonth?.metricValues?.[1]?.value || '0')) * 100).toFixed(1)
    const avgDur = parseFloat(thisMonth?.metricValues?.[2]?.value || '0')
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
    console.error('GA4 API error:', error)
    return Response.json({ error: 'GA4 data niet beschikbaar' }, { status: 500 })
  }
}
