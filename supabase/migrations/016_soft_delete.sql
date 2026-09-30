-- Desativação reversível: a linha permanece, só deixa de aparecer nas listas.

alter table public.leads
  add column if not exists active boolean not null default true;
alter table public.deals
  add column if not exists active boolean not null default true;
alter table public.contacts
  add column if not exists active boolean not null default true;
alter table public.organizations
  add column if not exists active boolean not null default true;
alter table public.products
  add column if not exists active boolean not null default true;
alter table public.notes
  add column if not exists active boolean not null default true;
alter table public.tasks
  add column if not exists active boolean not null default true;

create index if not exists idx_leads_ws_active on public.leads (workspace_id, active);
create index if not exists idx_deals_ws_active on public.deals (workspace_id, active);
create index if not exists idx_contacts_ws_active on public.contacts (workspace_id, active);
create index if not exists idx_organizations_ws_active on public.organizations (workspace_id, active);
create index if not exists idx_products_ws_active on public.products (workspace_id, active);
create index if not exists idx_notes_ws_active on public.notes (workspace_id, active);
create index if not exists idx_tasks_ws_active on public.tasks (workspace_id, active);
