-- Posts voor contentkalender
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  channel text,
  scheduled_date date,
  status text default 'idea',
  tags text[],
  reach integer default 0,
  engagement_rate decimal default 0,
  created_at timestamptz default now()
);

-- LinkedIn analytics data
create table if not exists linkedin_analytics (
  id uuid default gen_random_uuid() primary key,
  date date,
  impressions integer,
  clicks integer,
  reactions integer,
  comments integer,
  shares integer,
  created_at timestamptz default now()
);

-- Leads / CRM
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  source text,
  status text default 'new',
  estimated_value decimal,
  notes text,
  created_at timestamptz default now()
);

-- AI chat geschiedenis
create table if not exists chat_history (
  id uuid default gen_random_uuid() primary key,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
