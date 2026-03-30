-- Corrige: após INSERT em workspaces, o .select() falhava porque o utilizador
-- ainda não tinha linha em workspace_members (política anterior só lia via members).
-- Idempotente: pode correr mesmo que o 001 já inclua esta política.

drop policy if exists "workspaces_select_owner" on public.workspaces;

create policy "workspaces_select_owner" on public.workspaces for select
  using (owner_id = auth.uid());
