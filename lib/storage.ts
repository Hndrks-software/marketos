import { supabase } from '@/lib/supabase'

const BUCKET = 'lead-attachments'
const SIGNED_URL_TTL = 3600 // 1 uur

/**
 * Haal signed URLs op voor meerdere opslag-paden in één batch.
 * Retourneert een map {path → url}. Paden zonder URL komen niet in de map.
 */
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  if (unique.length === 0) return {}

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL)

  if (error || !data) return {}

  const out: Record<string, string> = {}
  for (const entry of data) {
    if (entry.path && entry.signedUrl) out[entry.path] = entry.signedUrl
  }
  return out
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) return null
  return data.signedUrl
}
