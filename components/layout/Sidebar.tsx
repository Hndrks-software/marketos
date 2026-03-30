'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Bot,
  Share2,
  Globe,
  Target,
  Settings,
  Zap,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar', icon: CalendarDays, label: 'Content Kalender' },
  { href: '/ai', icon: Bot, label: 'AI Adviseur' },
  { href: '/linkedin', icon: Share2, label: 'LinkedIn Analytics' },
  { href: '/website', icon: Globe, label: 'Website Analytics' },
  { href: '/leads', icon: Target, label: 'CRM & Leads' },
  { href: '/settings', icon: Settings, label: 'Instellingen' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-50" style={{ backgroundColor: '#0F1629' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6366F1' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">MarketOS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              style={isActive ? { backgroundColor: '#6366F1' } : {}}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ backgroundColor: '#6366F1' }}>
            M
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">Marketing Team</p>
            <p className="text-slate-500 text-xs truncate">Collo-X</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
