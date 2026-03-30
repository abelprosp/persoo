-- Corrige 42P17: infinite recursion in policy for relation "workspace_members"
-- A política antiga referenciava workspace_members dentro do USING do SELECT em workspace_members.

drop policy if exists "workspace_members_select" on public.workspace_members;

create policy "workspace_members_select" on public.workspace_members for select
  using (user_id = auth.uid());
