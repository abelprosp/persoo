-- Segunda correção para 42P17 em workspace_members INSERT.
-- Causa provável: policy de INSERT consulta workspaces; a policy de workspaces
-- consulta workspace_members e gera ciclo de RLS.

-- Helper sem RLS: dono do workspace?
create or replace function public.user_is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

revoke all on function public.user_is_workspace_owner(uuid) from public;
grant execute on function public.user_is_workspace_owner(uuid) to authenticated;

-- Reforça helper de memberships sem depender de RLS
create or replace function public.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select wm.workspace_id
  from public.workspace_members wm
  where wm.user_id = auth.uid();
$$;

revoke all on function public.user_workspace_ids() from public;
grant execute on function public.user_workspace_ids() to authenticated;

-- workspaces policies sem subquery direta em workspace_members
drop policy if exists "workspaces_select" on public.workspaces;
create policy "workspaces_select" on public.workspaces for select
  using (
    id in (select public.user_workspace_ids())
    or owner_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists "workspaces_select_owner" on public.workspaces;
create policy "workspaces_select_owner" on public.workspaces for select
  using (
    owner_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces for update
  using (
    public.user_is_workspace_owner(id)
    or public.user_can_manage_workspace_members(id)
    or public.is_super_admin()
  )
  with check (
    public.user_is_workspace_owner(id)
    or public.user_can_manage_workspace_members(id)
    or public.is_super_admin()
  );

-- INSERT policy de workspace_members sem SELECT direto em workspaces
drop policy if exists "workspace_members_insert" on public.workspace_members;
create policy "workspace_members_insert" on public.workspace_members
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and public.user_is_workspace_owner(workspace_id)
    )
    or public.user_can_manage_workspace_members(workspace_id)
    or public.is_super_admin()
  );
