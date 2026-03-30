import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { attachTrialToWorkspace } from "@/lib/subscriptions";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-cookie";

export { ACTIVE_WORKSPACE_COOKIE };

export type Workspace = {
  id: string;
  name: string;
  industry: string | null;
  ai_schema: Record<string, unknown> | null;
  created_at?: string;
};

export type WorkspaceContext = {
  active: Workspace | null;
  /** Todos os espaços onde o utilizador é membro */
  list: Workspace[];
};

/**
 * Resolve o workspace ativo (cookie + membros) e lista todos os acessíveis.
 * Cria "Minha empresa" se o utilizador ainda não tiver nenhum.
 */
export async function getWorkspaceContext(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceContext> {
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  const memberIds = [
    ...new Set((memberRows ?? []).map((r) => r.workspace_id)),
  ];

  async function loadByMemberIds(ids: string[]): Promise<WorkspaceContext> {
    if (ids.length === 0) return { active: null, list: [] };
    const { data: all, error: listErr } = await supabase
      .from("workspaces")
      .select("id, name, industry, ai_schema, created_at")
      .in("id", ids)
      .order("created_at", { ascending: true });

    if (listErr || !all?.length) return { active: null, list: [] };

    const list = all as Workspace[];
    const validPreferred =
      preferredId && ids.includes(preferredId) ? preferredId : null;
    const activeId = validPreferred ?? list[0]!.id;
    const active = list.find((w) => w.id === activeId) ?? list[0] ?? null;
    return { active, list };
  }

  async function reloadContextFromDb(): Promise<WorkspaceContext> {
    const { data: freshMembers } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);
    const freshIds = [
      ...new Set((freshMembers ?? []).map((r) => r.workspace_id)),
    ];
    return loadByMemberIds(freshIds);
  }

  async function createFirstWorkspace(): Promise<WorkspaceContext> {
    const { data: created, error } = await supabase
      .from("workspaces")
      .insert({
        name: "Minha empresa",
        owner_id: userId,
        industry: "Geral",
      })
      .select("id, name, industry, ai_schema")
      .single();

    if (error || !created) {
      if (error) {
        console.error(
          "workspace create",
          error.message,
          error.code,
          error.details ?? ""
        );
      }
      // Corrida no primeiro acesso: outra request pode ter criado no mesmo instante.
      return reloadContextFromDb();
    }

    const { error: memErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: created.id,
        user_id: userId,
        role: "owner",
      });

    if (memErr) {
      console.error("workspace_members insert", memErr.message);
      // Se outra request já inseriu membro, tenta recarregar contexto em vez de falhar.
      return reloadContextFromDb();
    }

    await attachTrialToWorkspace(supabase, created.id);

    const w = created as Workspace;
    return { active: w, list: [w] };
  }

  if (memberIds.length === 0) {
    return createFirstWorkspace();
  }

  return loadByMemberIds(memberIds);
}

/** @deprecated use getWorkspaceContext */
export async function getOrCreateWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<Workspace | null> {
  const { active } = await getWorkspaceContext(supabase, userId);
  return active;
}
