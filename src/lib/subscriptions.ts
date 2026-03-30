import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceSubscriptionRow = {
  id: string;
  workspace_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_plans?: {
    slug: string;
    name: string;
    trial_days: number;
    price_monthly_cents: number;
  } | null;
};

/**
 * Associa o plano Trial ao workspace (após criar workspace + membro).
 * Ignora erros silenciosamente se as tabelas ainda não existirem.
 */
export async function attachTrialToWorkspace(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<void> {
  const { data: plan, error: planErr } = await supabase
    .from("subscription_plans")
    .select("id, trial_days")
    .eq("slug", "trial")
    .eq("active", true)
    .maybeSingle();

  if (planErr || !plan?.id) {
    if (planErr?.code !== "42P01") {
      console.warn("attachTrialToWorkspace: plano trial", planErr?.message);
    }
    return;
  }

  const days = Math.max(1, Number(plan.trial_days) || 14);
  const trialEnds = new Date();
  trialEnds.setUTCDate(trialEnds.getUTCDate() + days);

  const { error: subErr } = await supabase.from("workspace_subscriptions").insert({
    workspace_id: workspaceId,
    plan_id: plan.id,
    status: "trialing",
    trial_ends_at: trialEnds.toISOString(),
    current_period_end: null,
    updated_at: new Date().toISOString(),
  });

  if (subErr) {
    if (subErr.code !== "42P01" && subErr.code !== "23505") {
      console.warn("attachTrialToWorkspace: insert", subErr.message);
    }
  }
}

export async function getWorkspaceSubscription(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceSubscriptionRow | null> {
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select(
      "id, workspace_id, plan_id, status, trial_ends_at, current_period_end"
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    console.warn("getWorkspaceSubscription", error.message);
    return null;
  }
  return data as WorkspaceSubscriptionRow | null;
}

export type AccessResult =
  | { ok: true }
  | {
      ok: false;
      reason: "trial_expired" | "subscription_expired" | "canceled";
      message: string;
    };

/** Utilizador normal: workspace tem trial ou assinatura válida. Super admin ignora. */
export function evaluateWorkspaceAccess(
  sub: WorkspaceSubscriptionRow | null,
  options: { bypass: boolean }
): AccessResult {
  if (options.bypass) return { ok: true };
  if (!sub) return { ok: true };

  const now = Date.now();

  if (sub.status === "past_due") {
    return {
      ok: false,
      reason: "subscription_expired",
      message:
        "Pagamento em falta. Regularize a subscrição para voltar a aceder ao CRM.",
    };
  }

  if (sub.status === "canceled" || sub.status === "expired") {
    return {
      ok: false,
      reason: sub.status === "canceled" ? "canceled" : "subscription_expired",
      message:
        sub.status === "canceled"
          ? "A subscrição deste espaço foi cancelada. Contacte o suporte."
          : "O período de subscrição terminou. Renove para continuar.",
    };
  }

  if (sub.status === "trialing" && sub.trial_ends_at) {
    const end = new Date(sub.trial_ends_at).getTime();
    if (now > end) {
      return {
        ok: false,
        reason: "trial_expired",
        message:
          "O período de trial terminou. Peça a um administrador para ativar um plano pago.",
      };
    }
  }

  if (sub.status === "active" && sub.current_period_end) {
    const end = new Date(sub.current_period_end).getTime();
    if (now > end) {
      return {
        ok: false,
        reason: "subscription_expired",
        message: "A subscrição expirou. Renove para continuar a utilizar o CRM.",
      };
    }
  }

  return { ok: true };
}

const STATUS_LABEL_PT: Record<string, string> = {
  trialing: "Período de teste",
  active: "Subscrição ativa",
  past_due: "Pagamento em falta",
  canceled: "Cancelada",
  expired: "Expirada",
};

export function subscriptionStatusLabelPt(status: string): string {
  return STATUS_LABEL_PT[status] ?? status;
}

export function formatPlanPriceEUR(cents: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
