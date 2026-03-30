import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side auth check for API routes.
 * Returns the authenticated user or null.
 */
export async function getAuthUser() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return null

    const cookieStore = await cookies()

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // API routes don't need to set cookies
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

/**
 * Helper that returns a 401 Response if not authenticated.
 * Use: const user = await requireAuth(); if (user instanceof Response) return user;
 */
export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Niet geautoriseerd' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return user
}
