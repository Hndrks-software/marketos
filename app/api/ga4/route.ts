import { JWT } from 'google-auth-library'

const propertyId = process.env.GA4_PROPERTY_ID || ''

function getCredentials() {
  // Lees credentials uit base64-encoded JSON (meest betrouwbaar voor Netlify)
  const base64 = process.env.GA4_SERVICE_ACCOUNT_BASE64 || ''
  if (base64) {
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    return { email: json.client_email, key: json.private_key }
  }
  // Fallback op losse env vars
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
  const data = await res.json()
  if (data.error) throw new Error(`GA4 API: ${JSON.stringify(data.error)}`)
  return data
}

export async function GET() {
  try {
    const token = await getAccessToken()

    const today = new Date()
    const daysAgo = (n: number) =>
      new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [sessionsData, topPagesData, sourcesData, monthData] = await Promise.all([
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(14), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 7,
      }),
      runReport(token, {
        dateRanges: [{ startDate: daysAgo(30), endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
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
      const d = row.dimensionValues?.[0]?.value || ''
      return {
        date: d.length === 8 ? `${d.slice(6)}/${d.slice(4, 6)}` : d,
        visitors: parseInt(row.metricValues?.[0]?.value || '0'),
      }
    })

    // Top pagina's
    const topPages = (topPagesData.rows || []).map((row: { dimensionValues: { value: string }[], metricValues: { value: string }[] }) => {
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
      'Organic Search': '#6366F1', 'Organic Social': '#8B5CF6',
      'Direct': '#A78BFA', 'Email': '#C4B5FD',
      'Paid Search': '#DDD6FE', 'Referral': '#818CF8',
    }
    const totalSrc = (sourcesData.rows || []).reduce(
      (s: number, r: { metricValues: { value: string }[] }) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0
    )
    const trafficSources = (sourcesData.rows || []).map((row: { dimensionValues: { value: string }[], metricValues: { value: string }[] }) => {
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

    return Response.json({ dailySessions, topPages, trafficSources, totalSessions, sessionsChange, bounceRate, avgDuration })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('GA4 fout:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
