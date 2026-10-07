-- Exportação BI: a chave de entrada pode também ler dados do workspace

alter table public.lead_api_keys
  add column if not exists can_export boolean not null default false;

alter table public.notes
  add column if not exists custom_data jsonb not null default '{}'::jsonb;

create index if not exists idx_leads_ws_updated
  on public.leads (workspace_id, updated_at);
create index if not exists idx_deals_ws_updated
  on public.deals (workspace_id, updated_at);
create index if not exists idx_contacts_ws_updated
  on public.contacts (workspace_id, updated_at);
create index if not exists idx_organizations_ws_updated
  on public.organizations (workspace_id, updated_at);
create index if not exists idx_tasks_ws_updated
  on public.tasks (workspace_id, updated_at);
create index if not exists idx_products_ws_updated
  on public.products (workspace_id, updated_at);
create index if not exists idx_notes_ws_updated
  on public.notes (workspace_id, updated_at);
