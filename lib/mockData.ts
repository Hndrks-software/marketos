import { Post, LinkedInAnalytics, Lead } from './supabase'

export const mockPosts: Post[] = [
  { id: '1', title: 'Why B2B marketing is changing in 2024', content: 'The B2B landscape is shifting dramatically. Buyers are more informed than ever, and traditional cold outreach is losing effectiveness. Here\'s what the data tells us about modern B2B marketing...', channel: 'linkedin', scheduled_date: '2024-03-01', status: 'live', tags: ['b2b', 'strategy'], reach: 4821, engagement_rate: 4.2, created_at: '2024-02-28T10:00:00Z' },
  { id: '2', title: '5 LinkedIn strategies that actually work', content: 'After analyzing 200+ LinkedIn posts, these 5 strategies consistently outperform. The key insight: authenticity beats polish every time...', channel: 'linkedin', scheduled_date: '2024-03-05', status: 'live', tags: ['linkedin', 'tips'], reach: 6203, engagement_rate: 5.8, created_at: '2024-03-04T09:00:00Z' },
  { id: '3', title: 'Case study: 3x pipeline in 90 days', content: 'How we helped a SaaS company triple their qualified pipeline in just 3 months using content-led growth...', channel: 'linkedin', scheduled_date: '2024-03-10', status: 'live', tags: ['casestudy', 'growth'], reach: 8944, engagement_rate: 6.1, created_at: '2024-03-09T11:00:00Z' },
  { id: '4', title: 'The content calendar that drives results', content: 'Stop posting randomly. Here is the exact content calendar structure that helped us grow our LinkedIn audience by 40% in Q1...', channel: 'linkedin', scheduled_date: '2024-03-15', status: 'live', tags: ['content', 'planning'], reach: 5123, engagement_rate: 3.9, created_at: '2024-03-14T08:00:00Z' },
  { id: '5', title: 'AI in B2B marketing: reality check', content: 'Everyone is talking about AI. But what actually works? After 6 months of testing AI tools for B2B marketing, here is our honest assessment...', channel: 'linkedin', scheduled_date: '2024-03-20', status: 'live', tags: ['ai', 'b2b'], reach: 11204, engagement_rate: 7.3, created_at: '2024-03-19T10:30:00Z' },
  { id: '6', title: 'Q1 marketing report: key learnings', content: 'Our Q1 review revealed some surprising insights about what content performs best for our audience...', channel: 'website', scheduled_date: '2024-03-25', status: 'live', tags: ['report', 'q1'], reach: 1820, engagement_rate: 2.1, created_at: '2024-03-24T14:00:00Z' },
  { id: '7', title: 'How to qualify B2B leads faster', content: '', channel: 'linkedin', scheduled_date: '2024-04-02', status: 'scheduled', tags: ['leads', 'sales'], reach: 0, engagement_rate: 0, created_at: '2024-03-25T09:00:00Z' },
  { id: '8', title: 'Newsletter: April edition', content: '', channel: 'email', scheduled_date: '2024-04-05', status: 'concept', tags: ['newsletter'], reach: 0, engagement_rate: 0, created_at: '2024-03-26T11:00:00Z' },
  { id: '9', title: 'Thought leadership piece on GTM strategy', content: '', channel: 'linkedin', scheduled_date: '2024-04-08', status: 'idea', tags: ['gtm', 'strategy'], reach: 0, engagement_rate: 0, created_at: '2024-03-27T10:00:00Z' },
  { id: '10', title: 'Website redesign announcement', content: '', channel: 'website', scheduled_date: '2024-04-10', status: 'review', tags: ['website', 'announcement'], reach: 0, engagement_rate: 0, created_at: '2024-03-27T15:00:00Z' },
  { id: '11', title: 'B2B buyer journey: 2024 edition', content: 'The modern B2B buyer completes 70% of their research before speaking to sales. Here is how to be present at every stage...', channel: 'linkedin', scheduled_date: '2024-03-03', status: 'live', tags: ['buyer', 'journey'], reach: 3922, engagement_rate: 3.5, created_at: '2024-03-02T09:00:00Z' },
  { id: '12', title: 'Demand gen vs lead gen: which wins', content: 'The debate rages on. But data suggests the answer is more nuanced than most people think...', channel: 'linkedin', scheduled_date: '2024-03-07', status: 'live', tags: ['demandgen', 'leadgen'], reach: 7341, engagement_rate: 5.2, created_at: '2024-03-06T11:00:00Z' },
  { id: '13', title: 'Email marketing is not dead', content: 'Our latest email campaign achieved 48% open rate. Here is exactly how we did it...', channel: 'email', scheduled_date: '2024-03-12', status: 'live', tags: ['email', 'openrate'], reach: 2200, engagement_rate: 48.0, created_at: '2024-03-11T08:00:00Z' },
  { id: '14', title: 'The power of social proof in B2B', content: '', channel: 'linkedin', scheduled_date: '2024-04-15', status: 'idea', tags: ['socialproof', 'b2b'], reach: 0, engagement_rate: 0, created_at: '2024-03-28T10:00:00Z' },
  { id: '15', title: 'Webinar recap: B2B growth strategies', content: 'Last week\'s webinar with 300+ attendees covered the top B2B growth strategies for 2024. Key takeaways...', channel: 'website', scheduled_date: '2024-03-17', status: 'live', tags: ['webinar', 'growth'], reach: 2840, engagement_rate: 3.1, created_at: '2024-03-16T16:00:00Z' },
  { id: '16', title: 'How to build a B2B content engine', content: '', channel: 'linkedin', scheduled_date: '2024-04-18', status: 'concept', tags: ['content', 'engine'], reach: 0, engagement_rate: 0, created_at: '2024-03-28T14:00:00Z' },
  { id: '17', title: 'LinkedIn ads vs organic: ROI comparison', content: '', channel: 'linkedin', scheduled_date: '2024-04-22', status: 'idea', tags: ['linkedin', 'ads', 'roi'], reach: 0, engagement_rate: 0, created_at: '2024-03-29T09:00:00Z' },
  { id: '18', title: 'Sales enablement content guide', content: 'Sales enablement is often an afterthought. Here is a framework for creating content that actually helps your sales team close deals...', channel: 'website', scheduled_date: '2024-03-22', status: 'live', tags: ['sales', 'enablement'], reach: 1560, engagement_rate: 2.8, created_at: '2024-03-21T10:00:00Z' },
  { id: '19', title: 'Q2 content strategy overview', content: '', channel: 'email', scheduled_date: '2024-04-01', status: 'review', tags: ['q2', 'strategy'], reach: 0, engagement_rate: 0, created_at: '2024-03-29T15:00:00Z' },
  { id: '20', title: 'The anatomy of a viral B2B post', content: 'After studying 500 high-performing B2B LinkedIn posts, these are the patterns that drive virality in professional networks...', channel: 'linkedin', scheduled_date: '2024-03-28', status: 'live', tags: ['viral', 'linkedin'], reach: 15420, engagement_rate: 8.9, created_at: '2024-03-27T11:00:00Z' },
]

export const mockLinkedInAnalytics: LinkedInAnalytics[] = Array.from({ length: 50 }, (_, i) => {
  const date = new Date('2024-02-01')
  date.setDate(date.getDate() + i)
  const base = 2000 + Math.sin(i * 0.3) * 800 + i * 30
  return {
    id: String(i + 1),
    date: date.toISOString().split('T')[0],
    impressions: Math.round(base + Math.random() * 500),
    clicks: Math.round(base * 0.04 + Math.random() * 50),
    reactions: Math.round(base * 0.03 + Math.random() * 30),
    comments: Math.round(base * 0.008 + Math.random() * 10),
    shares: Math.round(base * 0.005 + Math.random() * 8),
    created_at: new Date().toISOString(),
  }
})

const leadDefaults = { stage_id: null, contact_person: null, email: null, phone: null, priority: 'medium' as const, next_action: null, next_action_date: null, referred_by: null, cover_image_url: null, cover_image_path: null, closed_at: null }

export const mockLeads: Lead[] = [
  { id: '1', name: 'Emma de Vries', company: 'TechScale BV', source: 'linkedin', status: 'qualified', estimated_value: 24000, notes: 'Interested in full marketing package. Demo scheduled.', created_at: '2024-03-01T10:00:00Z', ...leadDefaults },
  { id: '2', name: 'Pieter Janssen', company: 'GrowthHQ', source: 'website', status: 'new', estimated_value: 8500, notes: 'Downloaded our B2B guide. Reached out via contact form.', created_at: '2024-03-05T14:00:00Z', ...leadDefaults },
  { id: '3', name: 'Sofia Bergman', company: 'NordSaaS', source: 'linkedin', status: 'won', estimated_value: 36000, notes: 'Closed! Annual contract signed.', created_at: '2024-02-15T09:00:00Z', ...leadDefaults },
  { id: '4', name: 'Marcus Weber', company: 'DataDriven GmbH', source: 'direct', status: 'qualified', estimated_value: 18000, notes: 'Referral from existing customer. High intent.', created_at: '2024-03-10T11:00:00Z', ...leadDefaults },
  { id: '5', name: 'Laura Smit', company: 'Conversion Lab', source: 'website', status: 'new', estimated_value: 12000, notes: 'Attended webinar, requested pricing.', created_at: '2024-03-15T15:00:00Z', ...leadDefaults },
  { id: '6', name: 'Thomas Müller', company: 'B2B Ventures', source: 'linkedin', status: 'lost', estimated_value: 15000, notes: 'Went with competitor. Price sensitivity.', created_at: '2024-02-20T10:00:00Z', ...leadDefaults },
  { id: '7', name: 'Anna Kowalski', company: 'ScaleUp Poland', source: 'direct', status: 'qualified', estimated_value: 22000, notes: 'CEO reached out after reading our case study.', created_at: '2024-03-12T09:00:00Z', ...leadDefaults },
  { id: '8', name: 'Jeroen van den Berg', company: 'DutchTech', source: 'linkedin', status: 'new', estimated_value: 9500, notes: 'Engaged with 3 posts. Ready for outreach.', created_at: '2024-03-20T16:00:00Z', ...leadDefaults },
  { id: '9', name: 'Claire Dubois', company: 'FrenchMarket SAS', source: 'website', status: 'won', estimated_value: 28000, notes: 'Q1 deal closed. Expanding to full retainer.', created_at: '2024-02-10T11:00:00Z', ...leadDefaults },
  { id: '10', name: 'Luca Romano', company: 'Milano Digital', source: 'direct', status: 'qualified', estimated_value: 16000, notes: 'Partnership inquiry. Exploring collaboration.', created_at: '2024-03-08T14:00:00Z', ...leadDefaults },
  { id: '11', name: 'Nadia Petersen', company: 'NordicGrowth', source: 'linkedin', status: 'new', estimated_value: 11000, notes: 'Commented on case study post.', created_at: '2024-03-22T10:00:00Z', ...leadDefaults },
  { id: '12', name: 'Kevin O\'Brien', company: 'Dublin SaaS', source: 'website', status: 'qualified', estimated_value: 19500, notes: 'Product-market fit discussion scheduled.', created_at: '2024-03-18T13:00:00Z', ...leadDefaults },
  { id: '13', name: 'Yuki Tanaka', company: 'TokyoB2B', source: 'direct', status: 'lost', estimated_value: 30000, notes: 'Too early stage, revisit in 6 months.', created_at: '2024-02-25T09:00:00Z', ...leadDefaults },
  { id: '14', name: 'Rens Hoekstra', company: 'Amsterdam Ventures', source: 'linkedin', status: 'won', estimated_value: 45000, notes: 'Enterprise deal. 12-month contract.', created_at: '2024-01-30T10:00:00Z', ...leadDefaults },
  { id: '15', name: 'Sandra Koch', company: 'BerlinGrowth', source: 'website', status: 'new', estimated_value: 7500, notes: 'Newsletter subscriber, clicked pricing CTA.', created_at: '2024-03-25T17:00:00Z', ...leadDefaults },
]

export const mockWeeklyReach = [
  { week: 'W1 Feb', reach: 18420 },
  { week: 'W2 Feb', reach: 22100 },
  { week: 'W3 Feb', reach: 19850 },
  { week: 'W4 Feb', reach: 25300 },
  { week: 'W1 Mrt', reach: 28100 },
  { week: 'W2 Mrt', reach: 31450 },
  { week: 'W3 Mrt', reach: 29800 },
  { week: 'W4 Mrt', reach: 38200 },
]

export const mockDailyVisitors = Array.from({ length: 14 }, (_, i) => {
  const date = new Date('2024-03-16')
  date.setDate(date.getDate() + i)
  return {
    date: date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    visitors: Math.round(280 + Math.random() * 180 + (i % 7 < 5 ? 120 : -60)),
  }
})

export const mockLeadSources = [
  { name: 'LinkedIn', value: 42, color: '#6366F1' },
  { name: 'Website', value: 28, color: '#8B5CF6' },
  { name: 'Direct', value: 18, color: '#A78BFA' },
  { name: 'Overig', value: 12, color: '#C4B5FD' },
]
