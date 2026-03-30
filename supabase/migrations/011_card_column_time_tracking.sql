-- Histórico de colunas por card + tempo em cada coluna

create table if not exists public.card_column_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'deal', 'task')),
  entity_id uuid not null,
  column_id text not null,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  duration_seconds int generated always as (
    case
      when exited_at is null then null
      else greatest(0, floor(extract(epoch from (exited_at - entered_at)))::int)
    end
  ) stored
);

create index if not exists idx_card_column_history_entity
  on public.card_column_history (workspace_id, entity_type, entity_id, entered_at desc);

alter table public.card_column_history enable row level security;

drop policy if exists "card_column_history_all" on public.card_column_history;
create policy "card_column_history_all" on public.card_column_history for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));
