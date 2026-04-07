'use client'

import ChatInterface from '@/components/ai/ChatInterface'
import ContextPanel from '@/components/ai/ContextPanel'

export default function SalesAgentPage() {
  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Chat - left */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col min-w-0">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-500 font-medium">Sales Agent actief</span>
        </div>
        <ChatInterface mode="sales" />
      </div>

      {/* Context panel - right */}
      <div className="w-64 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-y-auto">
        <ContextPanel mode="sales" />
      </div>
    </div>
  )
}
