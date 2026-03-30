import { createClient } from "@/lib/supabase/server";
import { WorkspacesAdmin } from "@/app/app/admin/workspaces/workspaces-admin";

export default async function AdminWorkspacesPage() {
  const supabase = await createClient();

  const [{ data: workspaces, error: wErr }, { data: subs }, { data: plans }] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, owner_id, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_subscriptions")
        .select("workspace_id, status, trial_ends_at, current_period_end, plan_id"),
      supabase
        .from("subscription_plans")
        .select("id, slug, name")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (wErr) {
    return (
      <p className="text-sm text-destructive">
        Erro ao carregar espaços. Confirme a migração 005 e políticas RLS.
      </p>
    );
  }

  return (
    <WorkspacesAdmin
      workspaces={workspaces ?? []}
      subs={subs ?? []}
      plans={plans ?? []}
    />
  );
}
