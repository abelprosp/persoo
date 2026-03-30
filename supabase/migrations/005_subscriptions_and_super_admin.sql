-- Planos, assinaturas por workspace e super administrador

alter table public.profiles
  add column if not exists is_super_admin boolean default false not null;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_monthly_cents int not null default 0 check (price_monthly_cents >= 0),
  /** Dias de trial ao atribuir este plano como período de teste (ex.: plano Trial). */
  trial_days int not null default 0 check (trial_days >= 0 and trial_days <= 365),
  max_seats int,
  features jsonb default '{}'::jsonb not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_subscription_plans_active on public.subscription_plans (active, sort_order);

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_workspace_subscriptions_workspace on public.workspace_subscriptions (workspace_id);
create index if not exists idx_workspace_subscriptions_status on public.workspace_subscriptions (status);

-- Função: super admin (SECURITY DEFINER para não depender de RLS em profiles)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

alter table public.subscription_plans enable row level security;
alter table public.workspace_subscriptions enable row level security;

-- Planos: leitura para utilizadores autenticados; escrita só super admin
create policy "subscription_plans_select_auth" on public.subscription_plans
  for select to authenticated using (true);

create policy "subscription_plans_write_super" on public.subscription_plans
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Assinaturas: membros do workspace ou super admin
create policy "workspace_subscriptions_select" on public.workspace_subscriptions
  for select to authenticated
  using (
    workspace_id in (select public.user_workspace_ids())
    or public.is_super_admin()
  );

create policy "workspace_subscriptions_insert" on public.workspace_subscriptions
  for insert to authenticated
  with check (
    workspace_id in (select public.user_workspace_ids())
    or public.is_super_admin()
  );

create policy "workspace_subscriptions_update" on public.workspace_subscriptions
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "workspace_subscriptions_delete" on public.workspace_subscriptions
  for delete to authenticated
  using (public.is_super_admin());

-- Perfis: super admin vê todos e pode atualizar flags administrativas
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_super" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Workspaces: super admin lista todos (gestão)
create policy "workspaces_select_super" on public.workspaces
  for select to authenticated
  using (public.is_super_admin());

create policy "workspace_members_select_super" on public.workspace_members
  for select to authenticated
  using (public.is_super_admin());

-- Planos iniciais: Trial (teste) e Profissional (assinatura)
insert into public.subscription_plans (
  slug, name, description, price_monthly_cents, trial_days, active, sort_order
)
values
  (
    'trial',
    'Trial',
    'Período de teste com acesso completo ao CRM. Ideal para avaliar o produto.',
    0,
    14,
    true,
    0
  ),
  (
    'pro',
    'Profissional',
    'Plano de assinatura mensal com todos os recursos para a sua equipa.',
    9900,
    0,
    true,
    1
  )
on conflict (slug) do nothing;
