import type { DbClient } from "@/lib/db/types";
import { cookies } from "next/headers";
import { provisionWorkspace } from "@/lib/workspace-provisioning";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-cookie";
export { ACTIVE_WORKSPACE_COOKIE };

export type Workspace = { id: string; name: string; industry: string | null; ai_schema: Record<string, unknown> | null; created_at?: string };
export type WorkspaceContext = { active: Workspace | null; list: Workspace[] };

export async function getWorkspaceContext(supabase: DbClient, userId: string): Promise<WorkspaceContext> {
  const preferredId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const { data: members, error } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId);
  if (error) throw new Error("Não foi possível carregar seus espaços de trabalho.");
  const ids = [...new Set((members ?? []).map(row => String(row.workspace_id)))];
  if (!ids.length) {
    const workspace = await provisionWorkspace(userId, "Minha empresa", true) as Workspace;
    return { active: workspace, list: [workspace] };
  }
  const { data, error: loadError } = await supabase.from("workspaces").select("id,name,industry,ai_schema,created_at").in("id", ids).order("created_at", { ascending: true });
  if (loadError) throw new Error("Não foi possível carregar seus espaços de trabalho.");
  const list = (data ?? []) as Workspace[];
  return { active: list.find(workspace => workspace.id === preferredId) ?? list[0] ?? null, list };
}

export async function getOrCreateWorkspace(supabase: DbClient, userId: string): Promise<Workspace | null> {
  return (await getWorkspaceContext(supabase, userId)).active;
}
