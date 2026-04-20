import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth
  const supabase = auth.supabase

  const rl = checkRateLimit(`${getClientIP(request)}:/api/content-ideas`, 20)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    // Haal best presterende posts op
    const { data: posts } = await supabase
      .from('linkedin_posts')
      .select('post_title,views,reactions,engagement_rate,content_type')
      .order('views', { ascending: false })
      .limit(10)

    const { data: scheduled } = await supabase
      .from('posts')
      .select('title,channel,scheduled_date,status')
      .in('status', ['idea', 'concept', 'scheduled'])
      .order('scheduled_date', { ascending: true })
      .limit(10)

    type PostRow = { post_title?: string; views?: number; reactions?: number; engagement_rate?: number; content_type?: string }
    const postContext = (posts || []).map((p: PostRow) =>
      `"${(p.post_title || '').slice(0, 80)}" — ${p.views || 0} views, ${p.reactions || 0} reacties, type: ${p.content_type || '?'}`
    ).join('\n')

    type ScheduledRow = { title?: string; channel?: string; scheduled_date?: string; status?: string }
    const scheduledContext = (scheduled || []).map((p: ScheduledRow) =>
      `"${p.title}" (${p.channel}, ${p.status}, ${p.scheduled_date})`
    ).join('\n')

    const prompt = `Je bent de contentstrateeg van Collo-X (B2B machinebouwer, logistiek/farmaceutisch).
Genereer 3 concrete content-ideeën voor LinkedIn posts.

BEST PRESTERENDE POSTS:
${postContext || 'Geen data beschikbaar'}

AL GEPLAND:
${scheduledContext || 'Niets gepland'}

REGELS:
- Baseer ideeën op wat eerder goed scoorde (content type, onderwerp, stijl)
- Vermijd overlap met al geplande content
- Collo-X maakt sorteer-/verpakkingsmachines voor farma en logistiek
- Geef voor elk idee: title (pakkende LinkedIn titel), content (eerste 2 zinnen van de post), channel ("linkedin"), tags (2-3 relevante tags)
- Schrijf in het Engels (hun LinkedIn is Engelstalig)

Geef ALLEEN een JSON-array terug:
[{ "title": "...", "content": "...", "channel": "linkedin", "tags": ["tag1", "tag2"] }]`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    let rawText = ''
    for (const block of response.content) {
      if (block.type === 'text') rawText += block.text
    }

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return Response.json({ error: 'Kon geen ideeën genereren' }, { status: 500 })
    }

    const ideas = JSON.parse(jsonMatch[0])
    return Response.json({ ideas })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('Content ideas fout:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
