'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  text: string
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-brand transition-colors focus:outline-none"
        aria-label="Meer informatie"
      >
        <Info size={13} />
      </button>

      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2.5 leading-relaxed shadow-xl">
            {text}
          </div>
          {/* Pijltje */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  )
}
