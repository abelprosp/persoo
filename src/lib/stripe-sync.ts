import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

type DbStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): DbStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
      return "trialing";
    case "paused":
      return "active";
    default:
      return "active";
  }
}

type SessionMeta = { workspace_id?: string | null; plan_id?: string | null };

/**
 * Grava ou atualiza `workspace_subscriptions` a partir de uma Subscription do Stripe.
 */
export async function upsertWorkspaceSubscriptionFromStripe(
  admin: SupabaseClient,
  stripeSub: Stripe.Subscription,
  sessionMeta?: SessionMeta
): Promise<void> {
  let workspaceId =
    stripeSub.metadata?.workspace_id?.trim() ||
    sessionMeta?.workspace_id?.trim() ||
    null;
  let planId =
    stripeSub.metadata?.plan_id?.trim() || sessionMeta?.plan_id?.trim() || null;

  if (!workspaceId || !planId) {
    const { data: existing } = await admin
      .from("workspace_subscriptions")
      .select("workspace_id, plan_id")
      .eq("stripe_subscription_id", stripeSub.id)
      .maybeSingle();

    if (existing) {
      workspaceId = workspaceId ?? existing.workspace_id;
      planId = planId ?? existing.plan_id;
    }
  }

  if (!workspaceId || !planId) {
    console.error(
      "[stripe-sync] Sem workspace_id/plan_id para subscription",
      stripeSub.id
    );
    return;
  }

  const customerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer?.id;

  const status = mapStripeSubscriptionStatus(stripeSub.status);
  const itemEnd = stripeSub.items?.data?.[0]?.current_period_end;
  const currentPeriodEnd =
    typeof itemEnd === "number"
      ? new Date(itemEnd * 1000).toISOString()
      : null;
  const trialEndsAt =
    status === "trialing" && stripeSub.trial_end
      ? new Date(stripeSub.trial_end * 1000).toISOString()
      : null;

  const now = new Date().toISOString();

  const { error } = await admin.from("workspace_subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan_id: planId,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: stripeSub.id,
      status,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
      updated_at: now,
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("[stripe-sync] upsert falhou", error.message);
  }
}

export async function markWorkspaceSubscriptionCanceledByStripeId(
  admin: SupabaseClient,
  stripeSubscriptionId: string
): Promise<void> {
  const { error } = await admin
    .from("workspace_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("[stripe-sync] cancel update falhou", error.message);
  }
}

export async function markWorkspaceSubscriptionPastDueByStripeId(
  admin: SupabaseClient,
  stripeSubscriptionId: string
): Promise<void> {
  const { error } = await admin
    .from("workspace_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("[stripe-sync] past_due update falhou", error.message);
  }
}
