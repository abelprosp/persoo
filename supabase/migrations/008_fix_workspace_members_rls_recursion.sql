-- Corrige recursão infinita de RLS em workspace_members (42P17)
-- Erro típico: "infinite recursion detected in policy for relation workspace_members"
-- Estratégia:
-- 1) Funções helper SECURITY DEFINER com row_security=off
-- 2) Recriar policies de workspace_members usando essas funções

-- Helper: ids de workspaces do utilizador atual (sem recursão de RLS)
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

-- Helper: utilizador pode gerir membros (owner/admin/super admin), sem recursão
create or replace function public.user_can_manage_workspace_members(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.workspaces w
      where w.id = p_workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    );
$$;

revoke all on function public.user_can_manage_workspace_members(uuid) from public;
grant execute on function public.user_can_manage_workspace_members(uuid) to authenticated;

-- Policies workspace_members
drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members
  for select to authenticated
  using (
    workspace_id in (select public.user_workspace_ids())
    or public.is_super_admin()
  );

drop policy if exists "workspace_members_insert" on public.workspace_members;
create policy "workspace_members_insert" on public.workspace_members
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and exists (
        select 1
        from public.workspaces w
        where w.id = workspace_id
          and w.owner_id = auth.uid()
      )
    )
    or public.user_can_manage_workspace_members(workspace_id)
  );

drop policy if exists "workspace_members_update_managers" on public.workspace_members;
create policy "workspace_members_update_managers" on public.workspace_members
  for update to authenticated
  using (public.user_can_manage_workspace_members(workspace_id))
  with check (public.user_can_manage_workspace_members(workspace_id));

drop policy if exists "workspace_members_delete_managers" on public.workspace_members;
create policy "workspace_members_delete_managers" on public.workspace_members
  for delete to authenticated
  using (public.user_can_manage_workspace_members(workspace_id));
