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
