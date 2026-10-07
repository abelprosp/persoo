import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { userCanManageWorkspaceBilling } from "@/lib/workspace-billing";
import { evaluateWorkspaceAccess, getWorkspaceSubscription } from "@/lib/subscriptions";
import { isSuperAdmin } from "@/lib/admin";
export async function workspaceAccess(manager = false) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { active: workspace } = await getWorkspaceContext(db,user.id);
  if (!workspace) throw new Error("Empresa não encontrada.");
  if (manager && !await userCanManageWorkspaceBilling(db,user.id,workspace.id)) throw new Error("Esta ação exige um administrador da empresa.");
  const access = evaluateWorkspaceAccess(await getWorkspaceSubscription(db,workspace.id), {bypass:await isSuperAdmin(db,user)});
  if (!access.ok && access.reason !== "trial_expired") throw new Error(access.message);
  return { db, user, workspace };
}
