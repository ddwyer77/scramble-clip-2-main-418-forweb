-- Initial migration for Scramble Clip Web App
-- Creates job_queue and videos tables, plus basic RLS policies
-- Run with `supabase db push` or apply via the Supabase dashboard

-- Enablepgcrypto for UUID generation (in case not already enabled)
create extension if not exists "pgcrypto";

-------------------------------------------------
--  Tables
-------------------------------------------------

create table if not exists public.job_queue (
    id          uuid primary key default gen_random_uuid(),
    owner_id    uuid references auth.users (id) on delete cascade,
    params      jsonb           not null,
    status      text            not null default 'queued', -- queued | processing | finished | error
    progress    integer         not null default 0,
    output_urls jsonb,
    created_at  timestamptz     not null default now()
);

create table if not exists public.videos (
    id          uuid primary key default gen_random_uuid(),
    owner_id    uuid references auth.users (id) on delete cascade,
    storage_path text           not null, -- e.g. "raw-videos/<uuid>.mp4"
    metadata    jsonb,
    created_at  timestamptz     not null default now()
);

-------------------------------------------------
--  Row‑Level Security
-------------------------------------------------

alter table public.job_queue enable row level security;
alter table public.videos   enable row level security;

create policy "Users can access their own jobs" on public.job_queue
    for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

create policy "Users can access their own videos" on public.videos
    for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- End of migration 