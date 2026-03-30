'use client'

import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overzicht van je marketing performance' },
  '/calendar': { title: 'Content Kalender', subtitle: 'Plan en beheer je contentplanning' },
  '/ai': { title: 'AI Adviseur', subtitle: 'Jouw persoonlijke B2B marketing expert' },
  '/linkedin': { title: 'LinkedIn Analytics', subtitle: 'Analyseer je LinkedIn performance' },
  '/website': { title: 'Website Analytics', subtitle: 'Inzicht in je websiteverkeer' },
  '/leads': { title: 'CRM & Leads', subtitle: 'Beheer je leads en pipeline' },
  '/settings': { title: 'Instellingen', subtitle: 'Beheer je account en integraties' },
}

export default function TopBar() {
  const pathname = usePathname()
  const page = pageTitles[pathname] || { title: 'MarketOS', subtitle: '' }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-slate-900 font-semibold text-base">{page.title}</h1>
        <p className="text-slate-500 text-xs">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Zoeken..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
          />
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <Bell size={18} className="text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#6366F1' }} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: '#6366F1' }}>
          M
        </div>
      </div>
    </header>
  )
}
