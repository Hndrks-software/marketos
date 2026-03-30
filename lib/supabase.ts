import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Post = {
  id: string
  title: string
  content: string
  channel: 'linkedin' | 'website' | 'email'
  scheduled_date: string
  status: 'idea' | 'concept' | 'review' | 'scheduled' | 'live'
  tags: string[]
  reach: number
  engagement_rate: number
  created_at: string
}

export type LinkedInAnalytics = {
  id: string
  date: string
  impressions: number
  clicks: number
  reactions: number
  comments: number
  shares: number
  engagement_rate?: number | null
  new_followers?: number | null
  total_followers?: number | null
  page_views?: number | null
  unique_visitors?: number | null
  created_at: string
}

export type LinkedInPost = {
  id: string
  post_url: string
  post_title: string
  post_type: string
  content_type?: string
  published_date: string
  audience?: string
  views: number
  unique_views?: number
  clicks: number
  ctr?: number
  reactions: number
  comments: number
  reposts: number
  follows?: number
  engagement_rate?: number
  created_at: string
}

export type Lead = {
  id: string
  name: string
  company: string
  source: string
  status: 'new' | 'qualified' | 'lost' | 'won'
  estimated_value: number
  notes: string
  stage_id: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  priority: 'low' | 'medium' | 'high'
  next_action: string | null
  next_action_date: string | null
  referred_by: string | null
  closed_at: string | null
  created_at: string
}

export type PipelineStage = {
  id: string
  name: string
  position: number
  color: string
  created_at: string
}

export type LeadActivity = {
  id: string
  lead_id: string
  type: 'note' | 'call' | 'email' | 'meeting' | 'status_change'
  description: string
  created_at: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
