'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, BriefcaseBusiness, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolResults?: ToolResult[]
}

interface ToolResult {
  name: string
  data: Record<string, unknown>
}

type AgentMode = 'marketing' | 'sales'

const marketingSuggestions = [
  'Analyseer mijn LinkedIn prestaties',
  'Geef contentideeën voor volgende week',
  'Schrijf een LinkedIn post over B2B marketing',
  'Wat werkte goed deze maand?',
]

const salesSuggestions = [
  'Welke leads moet ik vandaag opvolgen?',
  'Geef me een pipeline overzicht',
  'Toon alle leads met hoge prioriteit',
  'Welke deals staan al lang stil?',
]

function parseToolMarkers(text: string): { cleanText: string; toolResults: ToolResult[] } {
  const toolResults: ToolResult[] = []
  let cleanText = text

  // Extract tool results
  const resultRegex = /\n?\[\[TOOL_RESULT:(\w+):([\s\S]*?)\]\]\n?/g
  let match
  while ((match = resultRegex.exec(text)) !== null) {
    try {
      toolResults.push({ name: match[1], data: JSON.parse(match[2]) })
    } catch {
      // ignore parse errors
    }
  }

  // Remove all markers from display text
  cleanText = cleanText.replace(/\n?\[\[TOOL_START:\w+\]\]\n?/g, '')
  cleanText = cleanText.replace(/\n?\[\[TOOL_RESULT:\w+:[\s\S]*?\]\]\n?/g, '')

  return { cleanText: cleanText.trim(), toolResults }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolResultCard({ result }: { result: ToolResult }) {
  const { name } = result
  const data = result.data as any

  if (name === 'search_leads' && data.results) {
    const leads = data.results as Array<Record<string, unknown>>
    if (leads.length === 0) return null
    return (
      <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-600">{String(data.count)} lead(s) gevonden</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {leads.slice(0, 10).map((lead, i) => (
            <div key={i} className="px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-800">{lead.name as string}</p>
                <p className="text-xs text-slate-500">{lead.company as string}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700">€{((lead.estimated_value as number) || 0).toLocaleString('nl-NL')}</p>
                <div className="flex gap-1 justify-end mt-0.5">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', {
                    'bg-emerald-100 text-emerald-700': lead.status === 'won',
                    'bg-blue-100 text-blue-700': lead.status === 'qualified',
                    'bg-amber-100 text-amber-700': lead.status === 'new',
                    'bg-red-100 text-red-700': lead.status === 'lost',
                  })}>{lead.status as string}</span>
                  {lead.priority === 'high' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">hoog</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (name === 'get_pipeline_summary') {
    return (
      <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-xs text-slate-500">Totaal Leads</p>
            <p className="text-sm font-bold text-slate-800">{data.totaal_leads as number}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-xs text-slate-500">Pipeline Waarde</p>
            <p className="text-sm font-bold text-slate-800">€{((data.totale_pipeline_waarde as number) || 0).toLocaleString('nl-NL')}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-xs text-slate-500">Gewonnen</p>
            <p className="text-sm font-bold text-emerald-600">€{((data.gewonnen_waarde as number) || 0).toLocaleString('nl-NL')}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <p className="text-xs text-slate-500">Conversie</p>
            <p className="text-sm font-bold text-brand">{data.conversie_percentage as string}</p>
          </div>
        </div>
        {data.per_stage && (
          <div className="space-y-1">
            {(data.per_stage as Array<{ stage: string; count: number; value: number }>).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{s.stage}</span>
                <span className="text-slate-800 font-medium">{s.count} leads · €{s.value.toLocaleString('nl-NL')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (name === 'get_upcoming_followups') {
    const overdue = (data.achterstallig || []) as Array<Record<string, unknown>>
    const upcoming = (data.komende_dagen || []) as Array<Record<string, unknown>>
    return (
      <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        {overdue.length > 0 && (
          <>
            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
              <span className="text-xs font-semibold text-red-600">⚠ {overdue.length} achterstallig</span>
            </div>
            <div className="divide-y divide-slate-100">
              {overdue.map((lead, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{lead.name as string} — {lead.company as string}</p>
                    <p className="text-xs text-red-500">{lead.next_action as string} · {lead.next_action_date as string}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">€{((lead.estimated_value as number) || 0).toLocaleString('nl-NL')}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
              <span className="text-xs font-semibold text-blue-600">{upcoming.length} komende follow-ups</span>
            </div>
            <div className="divide-y divide-slate-100">
              {upcoming.map((lead, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{lead.name as string} — {lead.company as string}</p>
                    <p className="text-xs text-slate-500">{lead.next_action as string} · {lead.next_action_date as string}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">€{((lead.estimated_value as number) || 0).toLocaleString('nl-NL')}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {overdue.length === 0 && upcoming.length === 0 && (
          <div className="px-3 py-3 text-xs text-slate-500 text-center">Geen follow-ups gepland.</div>
        )}
      </div>
    )
  }

  if (name === 'get_lead_details') {
    const lead = data.lead as any
    if (!lead) return null
    return (
      <div className="mt-2 bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{lead.name as string}</p>
            <p className="text-xs text-slate-500">{lead.company as string}</p>
          </div>
          <p className="text-sm font-bold text-slate-800">€{((lead.estimated_value as number) || 0).toLocaleString('nl-NL')}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {lead.email && <div><span className="text-slate-400">Email:</span> <span className="text-slate-700">{lead.email as string}</span></div>}
          {lead.phone && <div><span className="text-slate-400">Tel:</span> <span className="text-slate-700">{lead.phone as string}</span></div>}
          {lead.contact_person && <div><span className="text-slate-400">Contact:</span> <span className="text-slate-700">{lead.contact_person as string}</span></div>}
          {lead.source && <div><span className="text-slate-400">Bron:</span> <span className="text-slate-700">{lead.source as string}</span></div>}
          {lead.stage_name && <div><span className="text-slate-400">Stage:</span> <span className="text-slate-700">{lead.stage_name as string}</span></div>}
          {lead.status && <div><span className="text-slate-400">Status:</span> <span className="text-slate-700">{lead.status as string}</span></div>}
        </div>
        {lead.notes && <p className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">{lead.notes as string}</p>}
      </div>
    )
  }

  if (name === 'update_lead' && data.success) {
    return (
      <div className="mt-2 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
        <span className="text-xs font-medium text-emerald-700">✓ Lead bijgewerkt</span>
      </div>
    )
  }

  if (name === 'create_activity' && data.success) {
    return (
      <div className="mt-2 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
        <span className="text-xs font-medium text-emerald-700">✓ Activiteit gelogd</span>
      </div>
    )
  }

  return null
}

export default function ChatInterface({ mode = 'marketing' }: { mode?: AgentMode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [activeTools, setActiveTools] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const suggestions = mode === 'sales' ? salesSuggestions : marketingSuggestions
  const apiEndpoint = mode === 'sales' ? '/api/sales-agent' : '/api/chat'

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    const { data } = await supabase
      .from('chat_history')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(50)

    if (data && data.length > 0) {
      setMessages(data as Message[])
    }
    setHistoryLoaded(true)
  }

  const saveMessage = async (role: string, content: string) => {
    await supabase.from('chat_history').insert({ role, content })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setActiveTools([])

    await saveMessage('user', text)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })

        // Check for active tool markers
        const toolStartMatch = fullText.match(/\[\[TOOL_START:(\w+)\]\]/)
        if (toolStartMatch) {
          setActiveTools(prev => {
            if (!prev.includes(toolStartMatch[1])) return [...prev, toolStartMatch[1]]
            return prev
          })
        }

        const { cleanText, toolResults } = parseToolMarkers(fullText)

        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: cleanText,
            toolResults: toolResults.length > 0 ? toolResults : undefined,
          }
          return updated
        })
      }

      setActiveTools([])
      const { cleanText } = parseToolMarkers(fullText)
      await saveMessage('assistant', cleanText)
    } catch {
      const errMsg = 'Er is een fout opgetreden. Probeer het opnieuw.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: errMsg }
        return updated
      })
      await saveMessage('assistant', errMsg)
    } finally {
      setIsLoading(false)
      setActiveTools([])
    }
  }

  const clearHistory = async () => {
    await supabase.from('chat_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const toolNameMap: Record<string, string> = {
    search_leads: 'Leads zoeken',
    get_lead_details: 'Lead details ophalen',
    get_pipeline_summary: 'Pipeline analyseren',
    get_upcoming_followups: 'Follow-ups checken',
    get_lead_activities: 'Activiteiten ophalen',
    update_lead: 'Lead bijwerken',
    create_activity: 'Activiteit loggen',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', mode === 'sales' ? 'bg-amber-100' : 'bg-brand-muted')}>
              {mode === 'sales' ? <BriefcaseBusiness size={24} className="text-amber-600" /> : <Bot size={24} className="text-brand" />}
            </div>
            <p className="text-slate-700 font-medium mb-1">
              {mode === 'sales' ? 'Sales Agent' : 'Hoe kan ik je helpen?'}
            </p>
            <p className="text-slate-400 text-sm">
              {mode === 'sales'
                ? 'Vraag me alles over je leads, pipeline en follow-ups.'
                : 'Stel me een vraag over je marketing data of laat me content schrijven.'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0', mode === 'sales' ? 'bg-amber-500' : 'bg-brand')}>
                {mode === 'sales' ? <BriefcaseBusiness size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
              </div>
            )}
            <div className="max-w-[80%]">
              <div
                className={cn(
                  'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
                )}
                style={msg.role === 'user' ? { backgroundColor: mode === 'sales' ? '#d97706' : 'var(--color-brand)' } : {}}
              >
                {msg.content || (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
              {msg.toolResults?.map((tr, j) => (
                <ToolResultCard key={j} result={tr} />
              ))}
            </div>
          </div>
        ))}

        {activeTools.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 animate-pulse pl-9">
            <Sparkles size={12} />
            {activeTools.map(t => toolNameMap[t] || t).join(', ')}...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && historyLoaded && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className={cn('text-xs px-3 py-2 bg-white border rounded-full transition-colors',
                mode === 'sales'
                  ? 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-brand'
              )}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-2 shrink-0 transition-colors">
            Wissen
          </button>
        )}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'sales' ? 'Vraag iets over je leads of pipeline...' : 'Stel een vraag... (Enter om te versturen)'}
          rows={1}
          className={cn('flex-1 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 resize-none',
            mode === 'sales' ? 'focus:ring-amber-500/30 focus:border-amber-500' : 'focus:ring-brand/30 focus:border-brand'
          )}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
          className={cn('w-10 h-10 flex items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40 shrink-0',
            mode === 'sales' ? 'bg-amber-500' : 'bg-brand'
          )}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
