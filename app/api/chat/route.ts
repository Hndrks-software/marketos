import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function buildSystemPrompt(): Promise<string> {
  // Haal echte data op uit Supabase
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0]

  const [analyticsRes, leadsRes, postsRes] = await Promise.all([
    supabase.from('linkedin_analytics').select('*').gte('date', weekAgo).order('date', { ascending: false }),
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('posts').select('*').eq('status', 'live').order('created_at', { ascending: false }).limit(10),
  ])

  const analytics = analyticsRes.data || []
  const leads = leadsRes.data || []
  const livePosts = postsRes.data || []

  // Bereken statistieken
  const weeklyImpressions = analytics.reduce((s: number, d: { impressions: number }) => s + d.impressions, 0)
  const weeklyEngagement = analytics.reduce((s: number, d: { reactions: number; comments: number; shares: number }) => s + d.reactions + d.comments + d.shares, 0)
  const engagementRate = weeklyImpressions > 0 ? ((weeklyEngagement / weeklyImpressions) * 100).toFixed(1) : '0'

  const totalLeads = leads.length
  const newLeads = leads.filter((l: { status: string }) => l.status === 'new').length
  const qualifiedLeads = leads.filter((l: { status: string }) => l.status === 'qualified').length
  const wonLeads = leads.filter((l: { status: string }) => l.status === 'won').length

  const bestPost = livePosts.sort((a: { reach: number }, b: { reach: number }) => b.reach - a.reach)[0]

  return `Je bent een expert B2B marketing adviseur voor het MarketOS platform. Hier is de actuele data van de gebruiker:

LinkedIn (afgelopen 7 dagen):
- Impressies: ${weeklyImpressions.toLocaleString('nl-NL')}
- Engagement acties: ${weeklyEngagement.toLocaleString('nl-NL')}
- Engagement rate: ${engagementRate}%
${bestPost ? `- Beste post: "${bestPost.title}" — ${bestPost.reach?.toLocaleString('nl-NL') || 0} bereik` : '- Nog geen live posts met bereikdata'}

CRM & Leads:
- Totaal leads: ${totalLeads}
- Nieuwe leads: ${newLeads}
- Gekwalificeerde leads: ${qualifiedLeads}
- Gewonnen deals: ${wonLeads}

Geef concrete, data-gedreven adviezen. Wees direct en bondig. Gebruik bullet points waar handig. Antwoord altijd in het Nederlands.`
}

export async function POST(request: Request) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const rl = checkRateLimit(`${getClientIP(request)}:/api/chat`, 20)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const body = await request.json()
    const messages = body?.messages
    if (!Array.isArray(messages)) {
      return Response.json({ error: 'Ongeldig verzoek' }, { status: 400 })
    }

    const systemPrompt = await buildSystemPrompt()

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
