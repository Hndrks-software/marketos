'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    supabaseUrl: '',
    supabaseKey: '',
    anthropicKey: '',
    teamName: 'Marketing Team',
    email: 'team@marketos.io',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Teaminstellingen</h3>
          <p className="text-xs text-slate-500 mt-0.5">Beheer je teamprofiel en voorkeuren</p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Teamnaam</label>
            <input value={form.teamName} onChange={e => setForm(p => ({ ...p, teamName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">E-mailadres</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Integraties & API-sleutels</h3>
          <p className="text-xs text-slate-500 mt-0.5">Verbind je tools met MarketOS via <code className="bg-slate-100 px-1 rounded">.env.local</code></p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Supabase Project URL</label>
            <input type="url" value={form.supabaseUrl} onChange={e => setForm(p => ({ ...p, supabaseUrl: e.target.value }))}
              placeholder="https://xxxx.supabase.co"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            <p className="text-xs text-slate-400 mt-1">Stel in als <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Supabase Anon Key</label>
            <input type="password" value={form.supabaseKey} onChange={e => setForm(p => ({ ...p, supabaseKey: e.target.value }))}
              placeholder="eyJh..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            <p className="text-xs text-slate-400 mt-1">Stel in als <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Anthropic API Key</label>
            <input type="password" value={form.anthropicKey} onChange={e => setForm(p => ({ ...p, anthropicKey: e.target.value }))}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            <p className="text-xs text-slate-400 mt-1">Stel in als <code className="bg-slate-100 px-1 rounded">ANTHROPIC_API_KEY</code></p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600">
            <p className="font-medium mb-2">📋 Hoe te configureren:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Kopieer <code className="bg-white px-1 rounded">.env.local.example</code> naar <code className="bg-white px-1 rounded">.env.local</code></li>
              <li>Vul de sleutels in het bestand in</li>
              <li>Herstart de development server</li>
              <li>Voer <code className="bg-white px-1 rounded">schema.sql</code> uit in je Supabase SQL-editor</li>
              <li>Voer optioneel <code className="bg-white px-1 rounded">seed.sql</code> uit voor testdata</li>
            </ol>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#6366F1' }}
          >
            {saved && <CheckCircle size={14} />}
            {saved ? 'Opgeslagen!' : 'Wijzigingen opslaan'}
          </button>
        </form>
      </div>
    </div>
  )
}
