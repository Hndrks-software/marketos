'use client'

import { useState } from 'react'
import ChatInterface from '@/components/ai/ChatInterface'
import ContextPanel from '@/components/ai/ContextPanel'
import { Bot, BriefcaseBusiness } from 'lucide-react'
import { cn } from '@/lib/utils'

type AgentMode = 'marketing' | 'sales'

export default function AIPage() {
  const [mode, setMode] = useState<AgentMode>('marketing')

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Chat - left */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col min-w-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', mode === 'sales' ? 'bg-amber-400' : 'bg-emerald-400')} />
            <span className="text-xs text-slate-500 font-medium">
              {mode === 'sales' ? 'Sales Agent actief' : 'AI Adviseur actief'}
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('marketing')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'marketing'
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Bot size={13} />
              Marketing
            </button>
            <button
              onClick={() => setMode('sales')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'sales'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <BriefcaseBusiness size={13} />
              Sales Agent
            </button>
          </div>
        </div>
        <ChatInterface mode={mode} />
      </div>

      {/* Context panel - right */}
      <div className="w-64 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-y-auto">
        <ContextPanel mode={mode} />
      </div>
    </div>
  )
}
