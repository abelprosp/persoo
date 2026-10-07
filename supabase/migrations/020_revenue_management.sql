-- Revenue management: explicit pipelines, proposals, goals and scoped team access.
create table if not exists sales_pipelines (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 name text not null check(length(name) between 1 and 100), pipeline_key text not null check(pipeline_key ~ '^[a-z][a-z0-9_]{0,59}$'),
 active boolean not null default true, created_at timestamptz not null default now(), unique(workspace_id,pipeline_key)
);
create table if not exists sales_pipeline_stages (
 id uuid primary key default gen_random_uuid(), pipeline_id uuid not null references sales_pipelines(id) on delete cascade,
 stage_key text not null check(stage_key ~ '^[a-z][a-z0-9_]{0,59}$'), title text not null check(length(title) between 1 and 100),
 position integer not null check(position>=0), is_won boolean not null default false, is_lost boolean not null default false,
 required_fields jsonb not null default '[]'::jsonb, unique(pipeline_id,stage_key), unique(pipeline_id,position)
);
alter table deals add column if not exists pipeline_id uuid references sales_pipelines(id) on delete restrict;
alter table deals add column if not exists next_action_at timestamptz;
alter table deals add column if not exists loss_reason text;
alter table deals add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table leads add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table tasks add column if not exists owner_id uuid references auth.users(id) on delete set null;

do $$ declare w record; p uuid; begin
 for w in select id from workspaces loop
  insert into sales_pipelines(workspace_id,name,pipeline_key) values(w.id,'Vendas','default') on conflict(workspace_id,pipeline_key) do update set name=excluded.name returning id into p;
  if p is null then select id into p from sales_pipelines where workspace_id=w.id and pipeline_key='default'; end if;
  insert into sales_pipeline_stages(pipeline_id,stage_key,title,position,is_won,is_lost) values
   (p,'qualification','Qualificação',0,false,false),(p,'proposal','Proposta',1,false,false),(p,'won','Ganho',2,true,false),(p,'lost','Perdido',3,false,true)
   on conflict(pipeline_id,stage_key) do nothing;
  update deals set pipeline_id=p where workspace_id=w.id and pipeline_id is null;
 end loop;
end $$;

create table if not exists sales_goals (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade, period_start date not null, period_end date not null,
 target_revenue numeric not null default 0 check(target_revenue>=0), target_wins integer not null default 0 check(target_wins>=0),
 created_at timestamptz not null default now(), check(period_end>=period_start), unique(workspace_id,user_id,period_start,period_end)
);
create table if not exists sales_proposals (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
 deal_id uuid not null references deals(id) on delete cascade, version integer not null check(version>0),
 status text not null default 'draft' check(status in ('draft','sent','accepted','declined','expired')),
 valid_until date, notes text not null default '', total numeric not null default 0 check(total>=0),
 public_token_hash text unique, sent_at timestamptz, accepted_at timestamptz, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), unique(deal_id,version)
);
create table if not exists sales_proposal_items (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references sales_proposals(id) on delete cascade,
 product_id uuid references products(id) on delete set null, description text not null check(length(description) between 1 and 300),
 quantity numeric not null default 1 check(quantity>0), unit_price numeric not null default 0 check(unit_price>=0), total numeric generated always as (quantity*unit_price) stored
);
create index if not exists deals_pipeline_idx on deals(workspace_id,pipeline_id,active,updated_at desc);
create index if not exists proposals_workspace_idx on sales_proposals(workspace_id,created_at desc);

create table if not exists workspace_member_scopes (
 workspace_id uuid not null references workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 entity text not null check(entity in ('leads','deals','tasks')), scope text not null check(scope in ('all','owned','team')) default 'all',
 updated_at timestamptz not null default now(), primary key(workspace_id,user_id,entity)
);

do $$ declare t text; begin
 foreach t in array array['sales_pipelines','sales_pipeline_stages','sales_goals','sales_proposals','sales_proposal_items','workspace_member_scopes'] loop
  execute format('alter table %I enable row level security',t);
  execute format('drop policy if exists tenant_read on %I',t);
  if t='sales_pipeline_stages' then
   execute 'create policy tenant_read on sales_pipeline_stages for select to authenticated using (pipeline_id in (select id from sales_pipelines))';
  elsif t='sales_proposal_items' then
   execute 'create policy tenant_read on sales_proposal_items for select to authenticated using (proposal_id in (select id from sales_proposals))';
  else
   execute format('create policy tenant_read on %I for select to authenticated using (workspace_id in (select public.user_workspace_ids()) and public.workspace_access_allowed(workspace_id))',t);
  end if;
  execute format('grant select on %I to authenticated',t);
 end loop;
end $$;
drop policy if exists proposal_insert on sales_proposals;
create policy proposal_insert on sales_proposals for insert to authenticated with check(created_by=auth.uid() and workspace_id in(select public.user_workspace_ids()));
drop policy if exists proposal_item_insert on sales_proposal_items;
create policy proposal_item_insert on sales_proposal_items for insert to authenticated with check(proposal_id in(select id from sales_proposals where created_by=auth.uid()));
grant insert on sales_proposals,sales_proposal_items to authenticated;
drop policy if exists scope_manage on workspace_member_scopes;
create policy scope_manage on workspace_member_scopes for all to authenticated using(public.user_can_manage_workspace_members(workspace_id)) with check(public.user_can_manage_workspace_members(workspace_id));
grant insert,update,delete on workspace_member_scopes to authenticated;
