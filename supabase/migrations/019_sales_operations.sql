-- Nullable historic dates: never invent a creation date for existing CRM data.
alter table leads add column if not exists created_at timestamptz;
alter table leads alter column created_at set default now();
alter table deals add column if not exists created_at timestamptz;
alter table deals alter column created_at set default now();
alter table contacts add column if not exists full_name text;
alter table tasks add column if not exists related_type text check(related_type in ('lead','deal'));
alter table tasks add column if not exists related_id uuid;

create table crm_saved_views (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, name text not null check(length(name) between 1 and 80),
 filters jsonb not null, created_at timestamptz not null default now(), unique(workspace_id,user_id,name)
);
create table crm_imports (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id), entity text not null check(entity in ('leads','contacts')),
 rows jsonb not null, result jsonb, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour'
);
create table crm_automation_rules (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 name text not null, trigger text not null check(trigger in ('lead_created','deal_stage','deal_stale')),
 stage text, delay_hours int not null default 24 check(delay_hours between 1 and 8760),
 action text not null check(action in ('task','notification')), title text not null,
 assignee_id uuid references auth.users(id) on delete set null, enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table crm_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 kind text not null, entity_id uuid not null, stage text, occurred_at timestamptz not null default now(), processed_at timestamptz
);
create index crm_events_pending on crm_events(occurred_at) where processed_at is null;
create table crm_automation_runs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 rule_id uuid not null references crm_automation_rules(id) on delete cascade, entity_id uuid not null, event_key text not null,
 state text not null default 'pending' check(state in ('pending','done','failed','skipped')), attempts int not null default 0,
 available_at timestamptz not null default now(), error text, created_at timestamptz not null default now(), completed_at timestamptz,
 unique(rule_id,event_key)
);
create index crm_runs_pending on crm_automation_runs(available_at) where state='pending';
create table crm_notifications (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, title text not null, href text not null,
 read_at timestamptz, created_at timestamptz not null default now(), run_id uuid unique references crm_automation_runs(id) on delete set null
);
create table crm_worker_health (name text primary key, heartbeat_at timestamptz not null);

create table whatsapp_connections (
 workspace_id uuid primary key references workspaces(id) on delete cascade,
 phone_number_id text not null unique, token_ciphertext text not null, display_phone text not null,
 enabled boolean not null default true, updated_at timestamptz not null default now()
);
create table whatsapp_conversations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 wa_id text not null, name text not null, assignee_id uuid references auth.users(id) on delete set null,
 lead_id uuid references leads(id) on delete set null, contact_id uuid references contacts(id) on delete set null,
 last_inbound_at timestamptz, updated_at timestamptz not null default now(), unique(workspace_id,wa_id)
);
create table whatsapp_messages (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
 provider_id text unique, request_id uuid unique, direction text not null check(direction in ('in','out')),
 body text not null, status text not null, error text, created_at timestamptz not null default now(), provider_at timestamptz
);
create index whatsapp_messages_thread on whatsapp_messages(conversation_id,created_at,id);
create index whatsapp_threads_recent on whatsapp_conversations(workspace_id,updated_at desc);

-- Only the service can write imports, jobs, messages, credentials and delivery states.
do $$ declare t text; begin
 foreach t in array array['crm_saved_views','crm_imports','crm_automation_rules','crm_events','crm_automation_runs','crm_notifications','crm_worker_health','whatsapp_connections','whatsapp_conversations','whatsapp_messages'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from authenticated',t);
 end loop;
 foreach t in array array['crm_automation_rules','crm_automation_runs','whatsapp_conversations','whatsapp_messages'] loop
  execute format('create policy tenant_read on %I for select to authenticated using (workspace_id in (select public.user_workspace_ids()) and public.workspace_access_allowed(workspace_id))',t);
  execute format('grant select on %I to authenticated',t);
 end loop;
end $$;
create policy own_views on crm_saved_views for all to authenticated using(user_id=auth.uid() and workspace_id in(select public.user_workspace_ids())) with check(user_id=auth.uid() and workspace_id in(select public.user_workspace_ids()));
grant select,insert,update,delete on crm_saved_views to authenticated;
create policy own_notifications on crm_notifications for select to authenticated using(user_id=auth.uid() and workspace_id in(select public.user_workspace_ids()));
create policy read_notifications on crm_notifications for update to authenticated using(user_id=auth.uid() and workspace_id in(select public.user_workspace_ids()));
grant select on crm_notifications to authenticated;
grant update(read_at) on crm_notifications to authenticated;

create function crm_capture_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not new.active or new.is_demo then return new; end if;
 if tg_table_name='leads' then
  insert into crm_events(workspace_id,kind,entity_id) values(new.workspace_id,'lead_created',new.id);
 elsif tg_op='INSERT' then
  insert into crm_events(workspace_id,kind,entity_id,stage) values(new.workspace_id,'deal_stage',new.id,new.stage);
 elsif new.stage is distinct from old.stage then
  insert into crm_events(workspace_id,kind,entity_id,stage) values(new.workspace_id,'deal_stage',new.id,new.stage);
 end if;
 return new;
end $$;
create trigger crm_new_lead after insert on leads for each row execute function crm_capture_event();
create trigger crm_deal_stage after insert or update of stage on deals for each row execute function crm_capture_event();
