import { JWT } from 'google-auth-library'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

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

async function getAccessToken(): Promise<string> {
  const { email, key } = getCredentials()
  const auth = new JWT({ email, key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
  const token = await auth.getAccessToken()
  return token.token || ''
}

async function runReport(token: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(`GA4 API: ${JSON.stringify(data.error)}`)
  return data
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const rl = checkRateLimit(`${getClientIP(request)}:/api/ga4`, 30)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const token = await getAccessToken()
    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 86400000).toISOString().split('T')[0]

    const [
      sessionsData, topPagesData, sourcesData, monthData,
      newVsRetData, deviceData, geoData, searchData, depthData,
    ] = await Promise.all([
      // Sessies per dag (14 dagen)
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(14), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
      // Top pagina's
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 7,
      }),
      // Verkeersbronnen
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      // Maandtotalen (2 periodes)
      runReport(token, {
        dateRanges: [
          { startDate: daysAgo(30), endDate: 'today' },
          { startDate: daysAgo(60), endDate: daysAgo(30) },
        ],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'screenPageViewsPerSession' }],
      }),
      // Nieuw vs terugkerend
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'sessions' }],
      }),
      // Apparaattype
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      // Top landen
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
      // Organische zoektermen
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'searchTerm' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
      // Sessiediepte (pagina's per sessie)
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViewsPerSession' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
    ])

    // Sessies per dag
    const dailySessions = (sessionsData.rows || []).map((row: Row) => {
      const d = row.dimensionValues?.[0]?.value || ''
      return {
        date: d.length === 8 ? `${d.slice(6)}/${d.slice(4, 6)}` : d,
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      }
    })

    // Top pagina's
    const topPages = (topPagesData.rows || []).map((row: Row) => {
      const dur = parseFloat(row.metricValues?.[2]?.value || '0')
      return {
        page: row.dimensionValues?.[0]?.value || '/',
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
        bounce: `${(parseFloat(row.metricValues?.[1]?.value || '0') * 100).toFixed(0)}%`,
        duration: `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}`,
      }
    })

    // Verkeersbronnen
    const sourceLabels: Record<string, string> = {
      'Organic Search': 'Organisch', 'Organic Social': 'Sociaal',
      'Direct': 'Direct', 'Email': 'E-mail',
      'Paid Search': 'Betaald', 'Referral': 'Referral',
    }
    const sourceColors: Record<string, string> = {
      'Organic Search': '#91B24A', 'Organic Social': '#8B5CF6',
      'Direct': '#A78BFA', 'Email': '#C4B5FD',
      'Paid Search': '#DDD6FE', 'Referral': '#818CF8',
    }
    const totalSrc = (sourcesData.rows || []).reduce(
      (s: number, r: Row) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const trafficSources = (sourcesData.rows || []).map((row: Row) => {
      const key = row.dimensionValues?.[0]?.value || 'Direct'
      const sessions = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: sourceLabels[key] || key,
        value: totalSrc > 0 ? Math.round((sessions / totalSrc) * 100) : 0,
        color: sourceColors[key] || '#94a3b8',
      }
    })

    // Maandtotalen
    const rows = monthData.rows || []
    const totalSessions = parseInt(rows[0]?.metricValues?.[0]?.value || '0')
    const lastMonthSessions = parseInt(rows[1]?.metricValues?.[0]?.value || '0')
    const sessionsChange = lastMonthSessions > 0
      ? Math.round(((totalSessions - lastMonthSessions) / lastMonthSessions) * 100) : 0
    const bounceRate = (parseFloat(rows[0]?.metricValues?.[1]?.value || '0') * 100).toFixed(1)
    const avgDur = parseFloat(rows[0]?.metricValues?.[2]?.value || '0')
    const avgDuration = `${Math.floor(avgDur / 60)}:${String(Math.floor(avgDur % 60)).padStart(2, '0')}`
    const pagesPerSession = parseFloat(rows[0]?.metricValues?.[3]?.value || '0').toFixed(1)

    // Nieuw vs terugkerend
    const newVsLabels: Record<string, string> = { 'new': 'Nieuw', 'returning': 'Terugkerend' }
    const newVsColors: Record<string, string> = { 'new': '#91B24A', 'returning': '#10B981' }
    const totalNvR = (newVsRetData.rows || []).reduce(
      (s: number, r: Row) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const newVsReturning = (newVsRetData.rows || []).map((row: Row) => {
      const key = row.dimensionValues?.[0]?.value || 'new'
      const val = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: newVsLabels[key] || key,
        value: totalNvR > 0 ? Math.round((val / totalNvR) * 100) : 0,
        color: newVsColors[key] || '#94a3b8',
      }
    })

    // Apparaattype
    const deviceLabels: Record<string, string> = { 'desktop': 'Desktop', 'mobile': 'Mobiel', 'tablet': 'Tablet' }
    const deviceColors: Record<string, string> = { 'desktop': '#91B24A', 'mobile': '#8B5CF6', 'tablet': '#A78BFA' }
    const totalDev = (deviceData.rows || []).reduce(
      (s: number, r: Row) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const deviceBreakdown = (deviceData.rows || []).map((row: Row) => {
      const key = row.dimensionValues?.[0]?.value || 'desktop'
      const val = parseInt(row.metricValues?.[0]?.value || '0')
      return {
        name: deviceLabels[key] || key,
        value: totalDev > 0 ? Math.round((val / totalDev) * 100) : 0,
        color: deviceColors[key] || '#94a3b8',
      }
    })

    // Top landen
    const topCountries = (geoData.rows || []).map((row: Row) => ({
      country: row.dimensionValues?.[0]?.value || 'Onbekend',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    }))

    // Organische zoektermen
    const searchTerms = (searchData.rows || [])
      .filter((row: Row) => row.dimensionValues?.[0]?.value !== '(not set)')
      .map((row: Row) => ({
        term: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      }))

    // Sessiediepte over tijd
    const sessionDepth = (depthData.rows || []).map((row: Row) => {
      const d = row.dimensionValues?.[0]?.value || ''
      return {
        date: d.length === 8 ? `${d.slice(6)}/${d.slice(4, 6)}` : d,
        pagesPerSession: parseFloat(row.metricValues?.[0]?.value || '0').toFixed(1),
      }
    })

    return Response.json({
      dailySessions, topPages, trafficSources,
      totalSessions, sessionsChange, bounceRate, avgDuration, pagesPerSession,
      newVsReturning, deviceBreakdown, topCountries, searchTerms, sessionDepth,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('GA4 fout:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
