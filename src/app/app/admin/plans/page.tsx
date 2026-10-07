import { createClient } from "@/lib/supabase/server";
import { PlanEditRow } from "@/app/app/admin/plans/plan-edit-row";
import { PRO_PLAN, TRIAL_DAYS, TRIAL_MAX_WORKSPACES, proMonthlyPriceLabel } from "@/lib/plans";

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, slug, name, description, price_monthly_cents, trial_days, active"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar planos. Execute a migração SQL 005 no Supabase.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O teste grátis de {TRIAL_DAYS} dias é atribuído a cada CRM novo (máximo
        de {TRIAL_MAX_WORKSPACES}). O plano {PRO_PLAN.name} custa{" "}
        {proMonthlyPriceLabel()}.
      </p>
      <div className="grid gap-4">
        {(plans ?? []).map((p) => (
          <PlanEditRow key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}
