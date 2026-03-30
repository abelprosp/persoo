-- Notas e atividades por card (lead/deal/task)

create table if not exists public.card_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'deal', 'task')),
  entity_id uuid not null,
  title text not null,
  content text,
  author_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.card_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'deal', 'task')),
  entity_id uuid not null,
  kind text not null default 'note',
  title text not null,
  description text,
  author_name text,
  meta jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_card_notes_workspace_entity
  on public.card_notes (workspace_id, entity_type, entity_id, updated_at desc);

create index if not exists idx_card_activities_workspace_entity
  on public.card_activities (workspace_id, entity_type, entity_id, created_at desc);

alter table public.card_notes enable row level security;
alter table public.card_activities enable row level security;

drop policy if exists "card_notes_all" on public.card_notes;
create policy "card_notes_all" on public.card_notes for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

drop policy if exists "card_activities_all" on public.card_activities;
create policy "card_activities_all" on public.card_activities for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));
