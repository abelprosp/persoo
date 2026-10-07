import { transaction, type QueryRunner } from "@/lib/db/pool";
import { TRIAL_DAYS, TRIAL_MAX_WORKSPACES, trialWorkspaceLimitMessage } from "@/lib/plans";

/** Called only with the verified session's user id. Serializes provisioning per owner. */
export async function provisionWorkspaceWithRunner(run: QueryRunner, userId: string, name: string, onlyIfMissing: boolean) {
  const user = await run("SELECT id FROM auth.users WHERE id=$1 FOR UPDATE", [userId]);
  if (!user.rowCount) throw new Error("Conta não encontrada.");
  if (onlyIfMissing) {
    const existing = await run("SELECT w.* FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=$1 ORDER BY w.created_at LIMIT 1", [userId]);
    if (existing.rows[0]) return existing.rows[0];
  }
  const gate = await run(`SELECT
    (SELECT count(*) FROM workspaces WHERE owner_id=$1)::int AS owned,
    coalesce((SELECT is_super_admin FROM profiles WHERE id=$1),false) AS admin,
    EXISTS(SELECT 1 FROM workspaces w JOIN workspace_subscriptions s ON s.workspace_id=w.id
      JOIN subscription_plans p ON p.id=s.plan_id WHERE w.owner_id=$1 AND p.slug='pro'
      AND s.status='active' AND (s.current_period_end IS NULL OR s.current_period_end>now())) AS pro`, [userId]);
  const permission = gate.rows[0];
  if (!permission.admin && !permission.pro && permission.owned >= TRIAL_MAX_WORKSPACES) throw new Error(trialWorkspaceLimitMessage());
  const plan = await run("SELECT id FROM subscription_plans WHERE slug='trial' AND active=true", []);
  if (!plan.rows[0]) throw new Error("Plano de teste indisponível. Contate o suporte.");
  const created = await run("INSERT INTO workspaces(name,owner_id,industry) VALUES($1,$2,'Geral') RETURNING *", [name, userId]);
  const workspace = created.rows[0];
  await run("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')", [workspace.id, userId]);
  await run("INSERT INTO workspace_subscriptions(workspace_id,plan_id,status,trial_started_at,trial_ends_at) VALUES($1,$2,'trialing',now(),now()+make_interval(days=>$3))", [workspace.id, plan.rows[0].id, TRIAL_DAYS]);
  return workspace;
}

export function provisionWorkspace(userId: string, name = "Minha empresa", onlyIfMissing = false) {
  return transaction(null, run => provisionWorkspaceWithRunner(run, userId, name, onlyIfMissing));
}
