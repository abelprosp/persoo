-- Apply transactionally with scripts/migrate.mjs. No existing data is deleted.
alter table auth.users add column if not exists session_version integer not null default 0;
create table if not exists auth.sessions (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists auth.password_resets (
  token_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz
);
create table if not exists public.app_rate_limits (
  key text not null, bucket bigint not null, hits integer not null,
  expires_at timestamptz not null, primary key(key,bucket)
);
create index if not exists app_rate_limits_expiry on public.app_rate_limits(expires_at);
create table if not exists public.stripe_events (
  id text primary key, type text not null, processed_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period text not null, used integer not null default 0 check(used>=0), primary key(workspace_id,period)
);
create table if not exists public.ai_previews (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, base_schema jsonb not null,
  schema jsonb not null, expires_at timestamptz not null default now()+interval '1 hour'
);
create table if not exists public.workspace_schema_history (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  schema jsonb, industry text, created_at timestamptz not null default now(), actor_id uuid
);
create table if not exists public.audit_events (
  id bigint generated always as identity primary key, workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_id uuid, entity text not null, entity_id uuid, action text not null, created_at timestamptz not null default now()
);
-- Internal tables are never accessible via the application role.
revoke all on public.app_rate_limits, public.stripe_events, public.ai_usage, public.ai_previews from authenticated;
alter table public.workspace_schema_history enable row level security;
create policy schema_history_read on public.workspace_schema_history for select to authenticated
  using(public.user_can_manage_workspace_members(workspace_id));
grant select on public.workspace_schema_history to authenticated;
alter table public.audit_events enable row level security;
create policy audit_read on public.audit_events for select to authenticated
  using(public.user_can_manage_workspace_members(workspace_id));
grant select on public.audit_events to authenticated;

create or replace function public.workspace_access_allowed(wid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from workspace_subscriptions s where s.workspace_id=wid and
   ((s.status='trialing' and s.trial_ends_at>now()) or
    (s.status='active' and (s.current_period_end is null or s.current_period_end>now()))))
$$;
revoke all on function public.workspace_access_allowed(uuid) from public;
grant execute on function public.workspace_access_allowed(uuid) to authenticated;

create or replace function public.guard_profile_privileges() returns trigger language plpgsql as $$
begin
  if current_user='authenticated' and ((tg_op='INSERT' and new.is_super_admin) or (tg_op='UPDATE' and new.is_super_admin is distinct from old.is_super_admin)) and not public.is_super_admin() then
    raise exception 'Não é permitido alterar permissões administrativas.' using errcode='42501';
  end if;
  return new;
end $$;
create trigger protect_profile_admin before insert or update on public.profiles for each row execute function public.guard_profile_privileges();

create or replace function public.audit_crm_change() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  r:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into audit_events(workspace_id,actor_id,entity,entity_id,action)
  values((r->>'workspace_id')::uuid,auth.uid(),tg_table_name,(r->>'id')::uuid,lower(tg_op));
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['leads','deals','contacts','organizations','products','notes','tasks'] loop
    execute format('alter table public.%I add column if not exists is_demo boolean not null default false',t);
    execute format('create policy subscription_required on public.%I as restrictive for all to authenticated using (public.is_super_admin() or public.workspace_access_allowed(workspace_id)) with check (public.is_super_admin() or public.workspace_access_allowed(workspace_id))',t);
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_crm_change()',t);
    execute format('create index if not exists %I on public.%I(workspace_id,active,updated_at desc,id)',t||'_listing_idx',t);
  end loop;
end $$;

create or replace function public.guard_contact_organization() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.organization_id is not null and not exists(select 1 from organizations where id=new.organization_id and workspace_id=new.workspace_id) then
   raise exception 'A organização deve pertencer à mesma empresa.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger contact_same_workspace before insert or update of organization_id,workspace_id on public.contacts for each row execute function public.guard_contact_organization();

create or replace function public.save_workspace_schema_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.ai_schema is distinct from old.ai_schema then
   insert into workspace_schema_history(workspace_id,schema,industry,actor_id) values(old.id,old.ai_schema,old.industry,auth.uid());
 end if;
 return new;
end $$;
create trigger schema_history before update of ai_schema on public.workspaces for each row execute function public.save_workspace_schema_history();

-- Business outcomes do not depend on customizable column labels.
alter table public.deals add column if not exists outcome text not null default 'open' check(outcome in ('open','won','lost'));
alter table public.deals add column if not exists closed_at timestamptz;
alter table public.deals add column if not exists probability numeric not null default 0.5 check(probability between 0 and 1);
alter table public.deals add column if not exists expected_close_at timestamptz;
alter table public.leads add column if not exists qualified_at timestamptz;
update public.deals set outcome=case when stage in ('won','ganho','fechado','faturado') then 'won' when stage in ('lost','perdido') then 'lost' else 'open' end;
-- Historical close dates cannot be inferred from updated_at; left unknown intentionally.
create or replace function public.track_deal_outcome() returns trigger language plpgsql as $$
begin
 if tg_op='INSERT' then
   if new.outcome<>'open' and new.closed_at is null then new.closed_at:=now(); end if;
 elsif new.outcome is distinct from old.outcome then
   new.closed_at:=case when new.outcome='open' then null else now() end;
 end if;
 return new;
end $$;
create trigger deal_outcome_date before insert or update on public.deals for each row execute function public.track_deal_outcome();

-- Move legacy usage out of editable schema; preserve already spent credits.
insert into public.ai_usage(workspace_id,period,used)
 select id,'trial',least(7,greatest(0,coalesce(nullif(ai_schema->>'ai_customize_trial_used',''),'0')::int))
 from workspaces where coalesce(ai_schema->>'ai_customize_trial_used','0') ~ '^\d+$' on conflict do nothing;
-- Notes and card history are subject to the same subscription gate.
do $$ declare t text; begin
 foreach t in array array['card_notes','card_activities','card_column_history','card_enrichments','lead_forms','lead_api_keys'] loop
  execute format('create policy subscription_required on public.%I as restrictive for all to authenticated using (public.is_super_admin() or public.workspace_access_allowed(workspace_id)) with check (public.is_super_admin() or public.workspace_access_allowed(workspace_id))',t);
 end loop;
end $$;

