import type { DbClient } from "@/lib/db/types";
import { PRO_PLAN, STRIPE_PRICE_PRO_ENV } from "@/lib/plans";

/** Dono do workspace ou membro owner/admin. */
export async function userCanManageWorkspaceBilling(
  supabase: DbClient,
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
  if (plan.slug === PRO_PLAN.slug) {
    const envId = process.env[STRIPE_PRICE_PRO_ENV]?.trim();
    if (envId) return envId;
  }
  return null;
}
