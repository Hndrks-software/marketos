'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Analyseer mijn LinkedIn prestaties',
  'Geef contentideeën voor volgende week',
  'Schrijf een LinkedIn post over B2B marketing',
  'Wat werkte goed deze maand?',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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

    await saveMessage('user', text)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }

      await saveMessage('assistant', assistantText)
    } catch {
      const errMsg = 'Er is een fout opgetreden. Controleer je API-sleutel in de Netlify environment variables.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: errMsg }
        return updated
      })
      await saveMessage('assistant', errMsg)
    } finally {
      setIsLoading(false)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {historyLoaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-muted flex items-center justify-center mb-4">
              <Bot size={24} className="text-brand" />
            </div>
            <p className="text-slate-700 font-medium mb-1">Hoe kan ik je helpen?</p>
            <p className="text-slate-400 text-sm">Stel me een vraag over je marketing data of laat me content schrijven.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
              )}
              style={msg.role === 'user' ? { backgroundColor: 'var(--color-brand)' } : {}}
            >
              {msg.content || (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && historyLoaded && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-300 hover:text-brand transition-colors">
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
          placeholder="Stel een vraag... (Enter om te versturen)"
          rows={1}
          className="flex-1 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40 shrink-0 bg-brand">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
