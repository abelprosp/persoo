-- Campos extra IA em tarefas + entidade produtos
alter table public.tasks
  add column if not exists custom_data jsonb default '{}'::jsonb;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  sku text,
  description text,
  unit_price numeric default 0,
  custom_data jsonb default '{}'::jsonb not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_products_workspace on public.products (workspace_id);

alter table public.products enable row level security;

create policy "products_all" on public.products for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));
