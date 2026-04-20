import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export type AuthContext = {
  user: User
  supabase: SupabaseClient
}

async function buildSupabaseServer(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // API routes run in a context where cookies are read-only; safe to ignore.
        }
      },
    },
  })
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await buildSupabaseServer()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { user: data.user, supabase }
}

export async function requireAuth(): Promise<AuthContext | Response> {
  const ctx = await getAuthContext()
  if (!ctx) {
    return new Response(
      JSON.stringify({ error: 'Niet geautoriseerd' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return ctx
}

/**
 * Service-role client for trusted server-side jobs (cron, scheduled reports).
 * Bypasses RLS — only use behind a verified shared-secret endpoint.
 */
export function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
