'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Bot,
  Share2,
  Globe,
  Target,
  Settings,
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
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-50 gradient-sidebar">
      {/* Logo */}
      <div className="flex items-center px-5 py-5 border-b border-white/8">
        <Image
          src="/collox-logo.png"
          alt="Collo-X by FarmaSort"
          width={148}
          height={44}
          className="object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'gradient-brand text-white shadow-lg shadow-brand/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon size={18} className={isActive ? 'text-white' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm shadow-brand/30">
            FH
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">Floris Hendriks</p>
            <p className="text-slate-500 text-[11px] truncate">Collo-X by FarmaSort</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
