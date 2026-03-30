-- persooCRM — esquema inicial (executar no SQL Editor do Supabase)
-- Habilita extensões úteis
create extension if not exists "uuid-ossp";

-- Perfis (espelha auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Workspaces (multi-tenant SaaS)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Minha empresa',
  owner_id uuid not null references auth.users (id) on delete cascade,
  industry text default 'Geral',
  -- Configuração de IA / campos dinâmicos por vertical
  ai_schema jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  primary key (workspace_id, user_id)
);

-- Entidades CRM
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  logo_url text,
  website text,
  industry text,
  annual_revenue numeric,
  custom_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text,
  phone text,
  organization_id uuid references public.organizations (id) on delete set null,
  custom_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'new',
  owner_name text,
  last_activity_at timestamptz,
  custom_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  value numeric default 0,
  stage text not null default 'qualification',
  email text,
  phone text,
  assignee_name text,
  organization_name text,
  last_updated timestamptz,
  custom_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  content text,
  author_name text,
  updated_at timestamptz default now() not null
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  priority text default 'medium',
  due_at timestamptz,
  assignee_name text,
  updated_at timestamptz default now() not null
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  caller_name text,
  receiver_name text,
  direction text default 'outgoing',
  status text default 'completed',
  duration_seconds int default 0,
  from_number text,
  to_number text,
  created_at timestamptz default now() not null
);

-- Índices
create index if not exists idx_org_workspace on public.organizations (workspace_id);
create index if not exists idx_contacts_workspace on public.contacts (workspace_id);
create index if not exists idx_leads_workspace on public.leads (workspace_id);
create index if not exists idx_deals_workspace on public.deals (workspace_id);
create index if not exists idx_notes_workspace on public.notes (workspace_id);
create index if not exists idx_tasks_workspace on public.tasks (workspace_id);
create index if not exists idx_calls_workspace on public.call_logs (workspace_id);
create index if not exists idx_members_user on public.workspace_members (user_id);

-- Trigger: criar profile ao registrar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.call_logs enable row level security;

-- Policies: usuário vê/edita apenas dados dos workspaces onde é membro
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

create policy "workspaces_select" on public.workspaces for select
  using (id in (select workspace_id from public.workspace_members where user_id = auth.uid()));
-- Dono pode ler o próprio workspace (necessário para INSERT...RETURNING antes de workspace_members)
create policy "workspaces_select_owner" on public.workspaces for select
  using (owner_id = auth.uid());
create policy "workspaces_insert" on public.workspaces for insert
  with check (owner_id = auth.uid());
create policy "workspaces_update" on public.workspaces for update
  using (id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role in ('owner', 'admin')));

-- Não usar subselect a workspace_members aqui: causa recursão infinita na RLS (42P17).
create policy "workspace_members_select" on public.workspace_members for select
  using (user_id = auth.uid());
create policy "workspace_members_insert" on public.workspace_members for insert
  with check (user_id = auth.uid());

-- Função auxiliar: workspaces do usuário
create or replace function public.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

create policy "org_all" on public.organizations for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "contacts_all" on public.contacts for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "leads_all" on public.leads for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "deals_all" on public.deals for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "notes_all" on public.notes for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "tasks_all" on public.tasks for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "call_logs_all" on public.call_logs for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));
