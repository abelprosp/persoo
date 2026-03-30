-- Equipa: ver colegas no mesmo workspace, convites por email, gestão por dono/admin
--
-- Nota: as políticas abaixo usam public.is_super_admin(), definida na migração 005.
-- Se correr só este ficheiro, criamos aqui a coluna e a função (idempotente).

alter table public.profiles
  add column if not exists is_super_admin boolean default false not null;

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

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Quem pode gerir membros (dono em workspaces ou role owner/admin em workspace_members)
create or replace function public.user_can_manage_workspace_members(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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

-- Perfis de utilizadores que partilham workspace (para mostrar nome na lista de equipa)
create or replace function public.user_ids_sharing_workspace_with_me()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct m2.user_id
  from public.workspace_members m1
  join public.workspace_members m2 on m2.workspace_id = m1.workspace_id
  where m1.user_id = auth.uid();
$$;

revoke all on function public.user_ids_sharing_workspace_with_me() from public;
grant execute on function public.user_ids_sharing_workspace_with_me() to authenticated;

drop policy if exists "profiles_select_workspace_peers" on public.profiles;
create policy "profiles_select_workspace_peers" on public.profiles
  for select to authenticated
  using (id in (select public.user_ids_sharing_workspace_with_me()));

-- workspace_members: ver todos os membros dos mesmos espaços (via função sem recursão na RLS)
drop policy if exists "workspace_members_select_super" on public.workspace_members;

drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members
  for select to authenticated
  using (
    workspace_id in (select public.user_workspace_ids())
    or public.is_super_admin()
  );

-- Inserção: dono a adicionar-se como primeiro membro OU gestores a convidarem outros
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

-- Convites pendentes (utilizador ainda sem conta ou ainda não aceitou)
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

create unique index if not exists idx_workspace_invitations_pending_ws_email
  on public.workspace_invitations (workspace_id, lower(trim(email)))
  where accepted_at is null;

create index if not exists idx_workspace_invitations_ws
  on public.workspace_invitations (workspace_id)
  where accepted_at is null;

alter table public.workspace_invitations enable row level security;

drop policy if exists "workspace_invitations_select" on public.workspace_invitations;
create policy "workspace_invitations_select" on public.workspace_invitations
  for select to authenticated
  using (public.user_can_manage_workspace_members(workspace_id));

drop policy if exists "workspace_invitations_insert" on public.workspace_invitations;
create policy "workspace_invitations_insert" on public.workspace_invitations
  for insert to authenticated
  with check (
    public.user_can_manage_workspace_members(workspace_id)
    and invited_by = auth.uid()
  );

drop policy if exists "workspace_invitations_delete" on public.workspace_invitations;
create policy "workspace_invitations_delete" on public.workspace_invitations
  for delete to authenticated
  using (public.user_can_manage_workspace_members(workspace_id));

-- Convida por email: se já existe utilizador, entra já; senão cria convite com link
create or replace function public.invite_workspace_member(
  p_workspace_id uuid,
  p_email text,
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := lower(trim(p_email));
  v_uid uuid;
  v_tok text;
begin
  if not public.user_can_manage_workspace_members(p_workspace_id) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if v_norm is null or v_norm = '' then
    return jsonb_build_object('error', 'invalid_email');
  end if;

  if p_role is null or p_role not in ('admin', 'member') then
    return jsonb_build_object('error', 'invalid_role');
  end if;

  if exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(trim(u.email::text)) = v_norm
  ) then
    return jsonb_build_object('error', 'cannot_invite_self');
  end if;

  select u.id
  into v_uid
  from auth.users u
  where lower(trim(u.email::text)) = v_norm
  limit 1;

  if v_uid is not null then
    if exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = v_uid
    ) then
      return jsonb_build_object('ok', true, 'kind', 'already_member');
    end if;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (p_workspace_id, v_uid, p_role);

    return jsonb_build_object('ok', true, 'kind', 'added');
  end if;

  if exists (
    select 1
    from public.workspace_invitations wi
    where wi.workspace_id = p_workspace_id
      and lower(trim(wi.email)) = v_norm
      and wi.accepted_at is null
      and wi.expires_at > now()
  ) then
    return jsonb_build_object('ok', true, 'kind', 'already_invited');
  end if;

  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
  values (p_workspace_id, v_norm, p_role, auth.uid())
  returning token into v_tok;

  return jsonb_build_object('ok', true, 'kind', 'invited', 'token', v_tok);
end;
$$;

revoke all on function public.invite_workspace_member(uuid, text, text) from public;
grant execute on function public.invite_workspace_member(uuid, text, text) to authenticated;

-- Aceitar convite (valida email da sessão)
create or replace function public.accept_workspace_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.workspace_invitations%rowtype;
  v_email text;
begin
  select u.email::text
  into v_email
  from auth.users u
  where u.id = auth.uid();

  if v_email is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select *
  into inv
  from public.workspace_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if inv.id is null then
    return jsonb_build_object('error', 'invalid_or_expired');
  end if;

  if lower(trim(inv.email)) <> lower(trim(v_email)) then
    return jsonb_build_object('error', 'email_mismatch');
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set accepted_at = now()
  where id = inv.id;

  return jsonb_build_object('ok', true, 'workspace_id', inv.workspace_id);
end;
$$;

revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
