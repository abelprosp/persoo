import type { SupabaseClient } from "@supabase/supabase-js";

/** Dono do workspace ou membro owner/admin. */
export async function userCanManageWorkspaceBilling(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: w } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (w?.owner_id === userId) return true;

  const { data: m } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return m?.role === "owner" || m?.role === "admin";
}

export type PlanForCheckout = {
  id: string;
  slug: string;
  name: string;
  stripe_price_id: string | null;
};

/**
 * Resolve o Price ID do Stripe: coluna `stripe_price_id` do plano ou env `STRIPE_PRICE_ID_PRO`.
 */
export function resolveStripePriceId(plan: PlanForCheckout): string | null {
  if (plan.stripe_price_id?.trim()) return plan.stripe_price_id.trim();
  if (plan.slug === "pro") {
    const envId = process.env.STRIPE_PRICE_ID_PRO?.trim();
    if (envId) return envId;
  }
  return null;
}
