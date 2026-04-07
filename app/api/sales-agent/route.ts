import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'
import { salesTools, handleToolCall } from '@/lib/sales-agent/tools'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Je bent een ervaren B2B sales agent binnen het MarketOS platform. Je helpt de gebruiker met hun sales pipeline en leads.

Je mogelijkheden:
- Leads zoeken, filteren en analyseren
- Pipeline overzichten en KPI's ophalen
- Follow-up lijsten genereren
- Lead details en activiteiten bekijken
- Leads bijwerken (status, prioriteit, notities) — alleen als de gebruiker dit expliciet vraagt
- Activiteiten loggen (notities, calls, meetings)

Regels:
- Je werkt ALLEEN binnen MarketOS. Je kunt geen emails versturen, geen LinkedIn berichten sturen, en geen externe diensten aanroepen.
- Antwoord altijd in het Nederlands.
- Wees direct en concreet. Gebruik tabellen/lijsten waar handig.
- Bij schrijf-acties (update_lead, create_activity): bevestig altijd WAT je gaat wijzigen voordat je de tool aanroept.
- Toon bedragen in euro's met € teken.
- Vandaag is ${new Date().toISOString().split('T')[0]}.`

const MAX_TOOL_ROUNDS = 8

export async function POST(request: Request) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const rl = checkRateLimit(`${getClientIP(request)}:/api/sales-agent`, 15)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const body = await request.json()
    const messages: Anthropic.MessageParam[] = body?.messages
    if (!Array.isArray(messages)) {
      return Response.json({ error: 'Ongeldig verzoek' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages]
          let toolRounds = 0

          while (toolRounds < MAX_TOOL_ROUNDS) {
            const response = await client.messages.create({
              model: 'claude-sonnet-4-5',
              max_tokens: 2048,
              system: SYSTEM_PROMPT,
              tools: salesTools,
              messages: currentMessages,
              stream: true,
            })

            let hasToolUse = false
            const toolUseBlocks: Array<{ id: string; name: string; input: string }> = []
            let currentToolId = ''
            let currentToolName = ''
            let currentToolInput = ''

            for await (const event of response) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  hasToolUse = true
                  currentToolId = event.content_block.id
                  currentToolName = event.content_block.name
                  currentToolInput = ''
                  // Signal tool use to client
                  controller.enqueue(encoder.encode(`\n[[TOOL_START:${currentToolName}]]\n`))
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  controller.enqueue(encoder.encode(event.delta.text))
                } else if (event.delta.type === 'input_json_delta') {
                  currentToolInput += event.delta.partial_json
                }
              } else if (event.type === 'content_block_stop') {
                if (currentToolId) {
                  toolUseBlocks.push({
                    id: currentToolId,
                    name: currentToolName,
                    input: currentToolInput,
                  })
                  currentToolId = ''
                }
              }
            }

            if (!hasToolUse) break

            // Execute tools and add results
            const assistantContent: Anthropic.ContentBlockParam[] = []
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            // Reconstruct assistant message content
            for (const block of toolUseBlocks) {
              let parsedInput = {}
              try {
                parsedInput = JSON.parse(block.input || '{}')
              } catch {
                // empty input is fine
              }
              assistantContent.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: parsedInput,
              })

              const result = await handleToolCall(block.name, parsedInput as Record<string, unknown>)
              controller.enqueue(encoder.encode(`\n[[TOOL_RESULT:${block.name}:${result}]]\n`))

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result,
              })
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: assistantContent },
              { role: 'user', content: toolResults },
            ]

            toolRounds++
          }

          controller.close()
        } catch (error) {
          console.error('Sales agent error:', error)
          controller.enqueue(encoder.encode('Er is een fout opgetreden bij de sales agent.'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Sales agent API error:', error)
    return Response.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
