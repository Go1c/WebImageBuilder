-- ============================================================
-- Lumio v2 · Schema Changes
-- ============================================================
-- P2 阶段执行。所有改动向后兼容，旧数据可正常读取。
-- 上线前在 staging 完整跑一遍迁移脚本。
-- ============================================================

-- ------------------------------------------------------------
-- 1. sessions (项目)
-- ------------------------------------------------------------
-- 这次改版的核心：作品归属感
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null default '未命名项目',
  description text,
  cover_task_id uuid,                -- 项目主图（指向 generation_tasks.id）
  -- 项目级别的"世界观"配置
  palette jsonb default '[]'::jsonb, -- ["#A4825D", "#3F4A5C", ...]
  style_lock jsonb default null,     -- {referenceTaskId, weight, mode: 'strict'|'soft'}
  pinned_refs jsonb default '[]'::jsonb,  -- [{url, weight, role: 'character'|'env'|'mood'}]
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_user_idx on sessions(user_id) where archived_at is null;
create index sessions_updated_idx on sessions(updated_at desc);

-- ------------------------------------------------------------
-- 2. generation_tasks 表加列
-- ------------------------------------------------------------
alter table generation_tasks
  add column if not exists session_id uuid references sessions(id) on delete set null,
  add column if not exists parent_task_id uuid references generation_tasks(id) on delete set null,
  -- ↑ 派生关系：从某张图 4× / inpaint / variation 出来的，记上游 id
  add column if not exists derive_kind text,  -- 'upscale' | 'variation' | 'inpaint' | 'extend' | null
  add column if not exists pinned boolean default false,
  add column if not exists hidden boolean default false;

create index gt_session_idx on generation_tasks(session_id, created_at desc)
  where session_id is not null;
create index gt_parent_idx on generation_tasks(parent_task_id)
  where parent_task_id is not null;

-- ------------------------------------------------------------
-- 3. 数据迁移：把孤儿 generations 收进"未分类"项目
-- ------------------------------------------------------------
-- 给每个有作品的用户建一个"未分类"项目，把其所有 generations 归过去
do $$
declare
  u record;
  unsorted_id uuid;
begin
  for u in select distinct user_id from generation_tasks where session_id is null
  loop
    insert into sessions (user_id, name, description)
    values (u.user_id, '未分类', '迁移之前的散图，可以拖进其他项目')
    returning id into unsorted_id;

    update generation_tasks
       set session_id = unsorted_id
     where user_id = u.user_id and session_id is null;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. exports (导出审计，可选)
-- ------------------------------------------------------------
create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  task_id uuid references generation_tasks(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  -- 至少有一个：批量导出整个项目时 task_id 为空
  format text not null,             -- 'png' | 'jpg' | 'webp' | 'psd' | 'svg' | 'lumio' | 'comfyui' | 'curl'
  variant text,                     -- '4k' | 'layered' | '8k_pro' | etc
  spend_credits integer default 0,
  succeeded_at timestamptz,
  created_at timestamptz not null default now()
);

create index exports_user_idx on exports(user_id, created_at desc);
create index exports_task_idx on exports(task_id) where task_id is not null;

-- ------------------------------------------------------------
-- 5. user_preferences 加列 (UI 模式记忆)
-- ------------------------------------------------------------
alter table users
  add column if not exists ui_mode text default 'basic'  -- 'basic' | 'pro'
    check (ui_mode in ('basic', 'pro')),
  add column if not exists ui_density text default 'comfy'  -- 'compact' | 'comfy'
    check (ui_density in ('compact', 'comfy'));

-- ------------------------------------------------------------
-- 6. 视图：项目卡片用的派生数据
-- ------------------------------------------------------------
create or replace view session_cards as
select
  s.id,
  s.user_id,
  s.name,
  s.description,
  s.palette,
  s.cover_task_id,
  s.created_at,
  s.updated_at,
  count(gt.id)                                         as task_count,
  max(gt.created_at)                                   as last_task_at,
  -- 取最近 4 张图作为副图栈
  (
    select array_agg(image_url order by created_at desc)
    from (
      select gt2.created_at,
             (gt2.params->>'output_url') as image_url
      from generation_tasks gt2
      where gt2.session_id = s.id
        and gt2.status = 'succeeded'
        and gt2.hidden = false
      order by gt2.created_at desc
      limit 4
    ) recent
  ) as recent_images
from sessions s
left join generation_tasks gt on gt.session_id = s.id and gt.status = 'succeeded'
where s.archived_at is null
group by s.id;

-- ============================================================
-- Rollback (上线前确认有此脚本)
-- ============================================================
-- drop view if exists session_cards;
-- alter table users drop column if exists ui_mode, drop column if exists ui_density;
-- drop table if exists exports;
-- alter table generation_tasks
--   drop column if exists session_id,
--   drop column if exists parent_task_id,
--   drop column if exists derive_kind,
--   drop column if exists pinned,
--   drop column if exists hidden;
-- drop table if exists sessions;
