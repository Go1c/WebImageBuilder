create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  external_user_id text not null unique,
  email text,
  display_name text,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anonymous_devices (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text not null unique,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists user_device_links (
  user_id uuid not null references users(id) on delete cascade,
  device_fingerprint text not null,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device_fingerprint)
);

create index if not exists user_device_links_ip_idx
  on user_device_links(user_id, ip_hash);

create table if not exists quota_balances (
  user_id uuid primary key references users(id) on delete cascade,
  login_used integer not null default 0,
  invite_credits integer not null default 0,
  paid_credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  anonymous_device_id uuid references anonymous_devices(id) on delete cascade,
  title text not null default '未命名创作',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generation_tasks (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('anonymous', 'user')),
  user_id uuid references users(id) on delete cascade,
  anonymous_device_id uuid references anonymous_devices(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  ip_hash text not null,
  device_fingerprint text,
  mode text not null,
  model_key text not null,
  provider text not null,
  provider_model text not null,
  prompt text not null,
  params jsonb not null default '{}',
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  spend_source text check (spend_source in ('anonymous', 'login', 'invite', 'paid')),
  error_message text,
  result_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_tasks_user_created_idx
  on generation_tasks(user_id, created_at desc);

create index if not exists generation_tasks_anon_created_idx
  on generation_tasks(anonymous_device_id, created_at desc);

create index if not exists generation_tasks_ip_created_idx
  on generation_tasks(ip_hash, created_at desc);

alter table generation_tasks
  add column if not exists device_fingerprint text;

update generation_tasks t
set device_fingerprint = d.device_fingerprint
from anonymous_devices d
where t.device_fingerprint is null
  and t.anonymous_device_id = d.id;

with single_user_device as (
  select user_id, min(device_fingerprint) as device_fingerprint
  from user_device_links
  group by user_id
  having count(*) = 1
)
update generation_tasks t
set device_fingerprint = single_user_device.device_fingerprint
from single_user_device
where t.device_fingerprint is null
  and t.spend_source = 'login'
  and t.user_id = single_user_device.user_id;

create index if not exists generation_tasks_device_trial_idx
  on generation_tasks(device_fingerprint, spend_source, status);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references generation_tasks(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  anonymous_device_id uuid references anonymous_devices(id) on delete cascade,
  asset_type text not null check (asset_type in ('reference', 'mask', 'result')),
  storage_key text not null unique,
  url text not null,
  mime_type text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists assets_task_idx on assets(task_id);
create index if not exists assets_user_idx on assets(user_id, created_at desc);

create table if not exists prompt_shares (
  id text primary key,
  task_id uuid references generation_tasks(id) on delete set null,
  asset_id uuid references assets(id) on delete set null,
  actor_type text not null check (actor_type in ('anonymous', 'user')),
  user_id uuid references users(id) on delete set null,
  anonymous_device_id uuid references anonymous_devices(id) on delete set null,
  prompt text not null,
  image_url text not null,
  image_storage_key text,
  image_mime_type text,
  status text not null default 'active' check (status in ('active', 'reported')),
  report_count integer not null default 0,
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prompt_shares_user_created_idx
  on prompt_shares(user_id, created_at desc);

create index if not exists prompt_shares_anon_created_idx
  on prompt_shares(anonymous_device_id, created_at desc);

alter table prompt_shares
  add column if not exists status text not null default 'active';

alter table prompt_shares
  add column if not exists report_count integer not null default 0;

alter table prompt_shares
  add column if not exists reported_at timestamptz;

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  inviter_user_id uuid not null references users(id) on delete cascade,
  invitee_user_id uuid not null unique references users(id) on delete cascade,
  invitee_device_fingerprint text not null,
  invitee_ip_hash text not null,
  status text not null check (status in ('pending', 'rewarded', 'blocked')),
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_inviter_idx on invites(inviter_user_id, created_at desc);

-- ============================================================
-- Admin backend additions
-- ============================================================

-- Persist structured upstream error detail + request correlation id on tasks
alter table generation_tasks
  add column if not exists request_id text;

alter table generation_tasks
  add column if not exists error_code text;

alter table generation_tasks
  add column if not exists upstream_detail jsonb;

create index if not exists generation_tasks_failed_idx
  on generation_tasks(status, created_at desc)
  where status = 'failed';

-- Allow admins to take shares down (soft state)
alter table prompt_shares
  drop constraint if exists prompt_shares_status_check;

alter table prompt_shares
  add constraint prompt_shares_status_check
  check (status in ('active', 'reported', 'removed'));

-- Material library (replaces static promptLibrary.ts, admin-managed)
create table if not exists material_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  prompt text not null default '',
  storage_key text,
  image_url text not null,
  image_mime_type text,
  legacy_case_number integer,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists material_items_sort_idx
  on material_items(status, sort_order asc, created_at desc);

-- Content-safety blocked terms
create table if not exists blocked_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  category text not null default '',
  action text not null default 'flag' check (action in ('flag', 'block')),
  hit_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

-- Marketing announcements / banners
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  placement text not null default 'home_banner',
  status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_status_idx
  on announcements(status, starts_at desc);

-- Admin action audit trail
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on admin_audit_logs(created_at desc);
