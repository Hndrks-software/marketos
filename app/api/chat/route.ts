import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const systemPrompt = `Je bent een expert B2B marketing adviseur voor het MarketOS platform. De gebruiker heeft de volgende recente data:
- LinkedIn bereik deze week: 38.200 impressies (+28.5% vs vorige maand)
- Beste post deze maand: "The anatomy of a viral B2B post" — 15.420 bereik, 8.9% engagement
- Websitebezoekers deze week: 4.821 sessies (+12.3%)
- Aantal nieuwe leads: 15 (5 gekwalificeerd, 3 gewonnen)
- Gemiddelde engagement rate LinkedIn: 5.4%
- Top kanalen: LinkedIn (42%), Website (28%), Direct (18%)

Geef concrete, data-gedreven adviezen. Wees direct en bondig. Gebruik bullet points waar handig. Antwoord altijd in het Nederlands.`

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
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
