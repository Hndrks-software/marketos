'use client'

import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overzicht van je marketing performance' },
  '/calendar': { title: 'Content Kalender', subtitle: 'Plan en beheer je contentplanning' },
  '/ai': { title: 'AI Adviseur', subtitle: 'Jouw persoonlijke B2B marketing expert' },
  '/linkedin': { title: 'LinkedIn Analytics', subtitle: 'Analyseer je LinkedIn performance' },
  '/website': { title: 'Website Analytics', subtitle: 'Inzicht in je websiteverkeer' },
  '/sales/pipeline': { title: 'Sales Pipeline', subtitle: 'Beheer je deals en volg prospects op' },
  '/leads': { title: 'CRM & Leads', subtitle: 'Beheer je leads en contacten' },
  '/settings': { title: 'Instellingen', subtitle: 'Beheer je account en integraties' },
}

export default function TopBar() {
  const pathname = usePathname()
  const page = pageTitles[pathname] || { title: 'MarketOS', subtitle: '' }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-slate-900 font-bold text-lg tracking-tight">{page.title}</h1>
        <p className="text-slate-400 text-xs">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Zoeken..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand w-52 transition-all"
          />
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand ring-2 ring-white" />
        </button>
        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-[11px] font-bold text-white shadow-sm shadow-brand/20">
          FH
        </div>
      </div>
    </header>
  )
}
