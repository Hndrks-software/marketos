import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BUCKET = 'lead-attachments'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const leadId = formData.get('lead_id') as string | null

  if (!file || !leadId) {
    return NextResponse.json({ error: 'File and lead_id required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${leadId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const fileUrl = urlData.publicUrl

  const isImage = file.type.startsWith('image/')

  const { data, error } = await supabase
    .from('lead_attachments')
    .insert({
      lead_id: leadId,
      file_name: file.name,
      file_url: fileUrl,
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
  const { id, file_url } = await req.json()

  // Extract storage path from URL
  const bucketPath = file_url.split(`/storage/v1/object/public/${BUCKET}/`)[1]
  if (bucketPath) {
    await supabase.storage.from(BUCKET).remove([bucketPath])
  }

  await supabase.from('lead_attachments').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
