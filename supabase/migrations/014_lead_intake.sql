-- Chaves de API e formulários públicos para cadastrar leads

create table if not exists public.lead_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  fields jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_lead_api_keys_workspace
  on public.lead_api_keys (workspace_id);

create table if not exists public.lead_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  public_id text not null unique,
  fields jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index if not exists idx_lead_forms_workspace
  on public.lead_forms (workspace_id);

alter table public.lead_api_keys enable row level security;
alter table public.lead_forms enable row level security;

drop policy if exists "lead_api_keys_select" on public.lead_api_keys;
create policy "lead_api_keys_select" on public.lead_api_keys
  for select to authenticated
  using (workspace_id in (select public.user_workspace_ids()));

drop policy if exists "lead_api_keys_write" on public.lead_api_keys;
create policy "lead_api_keys_write" on public.lead_api_keys
  for all to authenticated
  using (public.user_can_manage_workspace_members(workspace_id))
  with check (public.user_can_manage_workspace_members(workspace_id));

drop policy if exists "lead_forms_select" on public.lead_forms;
create policy "lead_forms_select" on public.lead_forms
  for select to authenticated
  using (workspace_id in (select public.user_workspace_ids()));

drop policy if exists "lead_forms_write" on public.lead_forms;
create policy "lead_forms_write" on public.lead_forms
  for all to authenticated
  using (public.user_can_manage_workspace_members(workspace_id))
  with check (public.user_can_manage_workspace_members(workspace_id));

grant select, insert, update, delete on public.lead_api_keys to authenticated;
grant select, insert, update, delete on public.lead_forms to authenticated;
