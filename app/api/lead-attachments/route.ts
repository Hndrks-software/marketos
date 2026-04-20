import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rateLimit'

const BUCKET = 'lead-attachments'
const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
])

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sanitizeFileName(name: string): string {
  // Strip path separators and control chars; keep a single extension
  const base = name.replace(/[\x00-\x1f/\\]/g, '').slice(0, 120)
  return base || 'file'
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const rl = checkRateLimit(`${getClientIP(req)}:/api/lead-attachments:POST`, 30)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const leadId = formData.get('lead_id') as string | null

  if (!file || !leadId) {
    return NextResponse.json({ error: 'File and lead_id required' }, { status: 400 })
  }
  if (!UUID_RE.test(leadId)) {
    return NextResponse.json({ error: 'Ongeldig lead_id' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Bestand te groot of leeg (max 15 MB)' }, { status: 400 })
  }

  // Soms is file.type leeg (iOS) — val terug op extensie-detectie.
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const effectiveMime = file.type || EXT_TO_MIME[ext] || ''
  if (!ALLOWED_MIME.has(effectiveMime)) {
    return NextResponse.json(
      { error: `Bestandstype niet toegestaan (${file.type || ext || 'onbekend'})` },
      { status: 400 }
    )
  }

  const safeName = sanitizeFileName(file.name)
  const path = `${leadId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await auth.supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: effectiveMime || 'application/octet-stream', upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Signed URL direct teruggeven zodat de frontend 'm meteen kan tonen.
  const { data: signed } = await auth.supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  const fileUrl = signed?.signedUrl || ''

  const { data, error } = await auth.supabase
    .from('lead_attachments')
    .insert({
      lead_id: leadId,
      file_name: safeName,
      file_path: path,
      file_url: fileUrl, // signed url — verloopt, maar frontend haalt 'm opnieuw op via file_path
      file_type: file.type,
      is_cover: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const rl = checkRateLimit(`${getClientIP(req)}:/api/lead-attachments:DELETE`, 30)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await req.json().catch(() => null)
  const id = body?.id

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ongeldig id' }, { status: 400 })
  }

  // Haal eerst het opslag-pad uit de DB op — vertrouw niet op de client.
  const { data: attachment } = await auth.supabase
    .from('lead_attachments')
    .select('file_path')
    .eq('id', id)
    .single()

  const path = attachment?.file_path
  if (typeof path === 'string' && path.length > 0 && !path.includes('..')) {
    await auth.supabase.storage.from(BUCKET).remove([path])
  }

  await auth.supabase.from('lead_attachments').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
