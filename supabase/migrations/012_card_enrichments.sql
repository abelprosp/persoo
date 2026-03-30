-- Checklists, documentos (links), equipa e etiquetas por card (lead/deal/task)

create table if not exists public.card_enrichments (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'deal', 'task')),
  entity_id uuid not null,
  checklists jsonb default '[]'::jsonb not null,
  documents jsonb default '[]'::jsonb not null,
  team_members jsonb default '[]'::jsonb not null,
  labels jsonb default '[]'::jsonb not null,
  updated_at timestamptz default now() not null,
  primary key (workspace_id, entity_type, entity_id)
);

create index if not exists idx_card_enrichments_workspace_entity
  on public.card_enrichments (workspace_id, entity_type);

alter table public.card_enrichments enable row level security;

drop policy if exists "card_enrichments_all" on public.card_enrichments;
create policy "card_enrichments_all" on public.card_enrichments for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));
