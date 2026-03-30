import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const maxDuration = 30

export async function POST(request: Request) {
  // Beveilig het endpoint met een secret token
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (token !== process.env.REPORT_SECRET) {
    return Response.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    // LinkedIn data deze week vs vorige week
    const [thisWeekRes, lastWeekRes, leadsRes, postsRes] = await Promise.all([
      supabase.from('linkedin_analytics').select('impressions,clicks,reactions,new_followers')
        .gte('date', fmt(weekAgo)).lte('date', fmt(now)),
      supabase.from('linkedin_analytics').select('impressions,clicks,reactions,new_followers')
        .gte('date', fmt(twoWeeksAgo)).lte('date', fmt(weekAgo)),
      supabase.from('leads').select('name,company,source,status,created_at')
        .gte('created_at', new Date(weekAgo).toISOString()),
      supabase.from('linkedin_posts').select('post_title,views,reactions,engagement_rate,published_date')
        .gte('published_date', fmt(weekAgo)).order('views', { ascending: false }).limit(1),
    ])

    type AnalyticsRow = { impressions?: number; clicks?: number; reactions?: number; new_followers?: number }
    const thisWeek = (thisWeekRes.data || []) as AnalyticsRow[]
    const lastWeek = (lastWeekRes.data || []) as AnalyticsRow[]

    const sum = (arr: AnalyticsRow[], key: keyof AnalyticsRow) =>
      arr.reduce((s, r) => s + (r[key] || 0), 0)

    const impressNow = sum(thisWeek, 'impressions')
    const impressPrev = sum(lastWeek, 'impressions')
    const impressChange = impressPrev > 0 ? Math.round(((impressNow - impressPrev) / impressPrev) * 100) : 0
    const reactionsNow = sum(thisWeek, 'reactions')
    const newFollowers = sum(thisWeek, 'new_followers')
    const newLeads = (leadsRes.data || []).length
    type PostRow = { post_title?: string; views?: number; reactions?: number; engagement_rate?: number; published_date?: string }
    const bestPost = (postsRes.data?.[0] || null) as PostRow | null

    const changeArrow = impressChange >= 0 ? '↑' : '↓'
    const changeColor = impressChange >= 0 ? '#10B981' : '#EF4444'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 32px; color: white; }
  .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .header p { margin: 0; opacity: 0.8; font-size: 14px; }
  .body { padding: 28px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border-radius: 12px; padding: 16px; }
  .kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .kpi-label { font-size: 12px; color: #64748b; }
  .kpi-change { font-size: 13px; font-weight: 600; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .post-card { background: #f8fafc; border-radius: 12px; padding: 16px; }
  .post-title { font-size: 14px; color: #1e293b; font-weight: 500; margin-bottom: 8px; line-height: 1.5; }
  .post-stats { display: flex; gap: 16px; }
  .post-stat { font-size: 12px; color: #64748b; }
  .post-stat strong { color: #334155; }
  .leads-list { list-style: none; padding: 0; margin: 0; }
  .leads-list li { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; }
  .leads-list li:last-child { border-bottom: none; }
  .footer { background: #f8fafc; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>📊 Jouw weekrapport — MarketOS</h1>
    <p>Week van ${fmt(weekAgo)} t/m ${fmt(now)}</p>
  </div>
  <div class="body">
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value">${impressNow.toLocaleString('nl-NL')}</div>
        <div class="kpi-label">LinkedIn impressies</div>
        <div class="kpi-change" style="color:${changeColor}">${changeArrow} ${Math.abs(impressChange)}% vs vorige week</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${reactionsNow}</div>
        <div class="kpi-label">Reacties & betrokkenheid</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${newFollowers}</div>
        <div class="kpi-label">Nieuwe volgers</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${newLeads}</div>
        <div class="kpi-label">Nieuwe leads</div>
      </div>
    </div>

    ${bestPost ? `
    <div class="section">
      <div class="section-title">🏆 Beste post van de week</div>
      <div class="post-card">
        <div class="post-title">${(bestPost.post_title || '').slice(0, 120)}...</div>
        <div class="post-stats">
          <div class="post-stat"><strong>${(bestPost.views || 0).toLocaleString('nl-NL')}</strong> weergaven</div>
          <div class="post-stat"><strong>${bestPost.reactions || 0}</strong> reacties</div>
          <div class="post-stat"><strong>${bestPost.engagement_rate ? (bestPost.engagement_rate * 100).toFixed(1) : '—'}%</strong> engagement</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${newLeads > 0 ? `
    <div class="section">
      <div class="section-title">👥 Nieuwe leads (${newLeads})</div>
      <ul class="leads-list">
        ${(leadsRes.data || []).map((l: { name?: string; company?: string; source?: string }) =>
          `<li><strong>${l.name || 'Onbekend'}</strong>${l.company ? ` — ${l.company}` : ''}${l.source ? ` · via ${l.source}` : ''}</li>`
        ).join('')}
      </ul>
    </div>
    ` : '<p style="color:#94a3b8;font-size:13px;">Geen nieuwe leads deze week.</p>'}
  </div>
  <div class="footer">
    Gegenereerd door MarketOS · <a href="https://marketoscollox.netlify.app" style="color:#6366F1">Open dashboard</a>
  </div>
</div>
</body>
</html>`

    const resend = new Resend(process.env.RESEND_API_KEY || '')
    const toEmail = process.env.REPORT_EMAIL_TO || ''

    if (!toEmail) return Response.json({ error: 'REPORT_EMAIL_TO niet ingesteld' }, { status: 500 })

    const { error: emailError } = await resend.emails.send({
      from: 'MarketOS <rapport@resend.dev>',
      to: toEmail,
      subject: `📊 Weekrapport MarketOS — ${impressNow.toLocaleString('nl-NL')} impressies ${changeArrow}${Math.abs(impressChange)}%`,
      html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return Response.json({ error: String(emailError) }, { status: 500 })
    }

    return Response.json({ success: true, to: toEmail, impressions: impressNow, leads: newLeads })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('Weekly report fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
