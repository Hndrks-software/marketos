import { JWT } from 'google-auth-library'

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
  const auth = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })
  const token = await auth.getAccessToken()
  return token.token || ''
}

export async function GET() {
  try {
    const token = await getAccessToken()

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    )

    const data = await res.json()
    const activeUsers = parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0')

    return Response.json({ activeUsers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('GA4 Realtime fout:', message)
    return Response.json({ activeUsers: 0 }, { status: 200 })
  }
}
