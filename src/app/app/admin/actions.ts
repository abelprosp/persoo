"use server";

import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

async function adminSupabase(): Promise<{
  supabase: SupabaseClient | null;
  user: User | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isSuperAdmin(supabase, user))) {
    return { supabase: null, user: null };
  }
  return { supabase, user };
}

export async function updateSubscriptionPlan(fields: {
  id: string;
  name: string;
  description: string;
  price_monthly_cents: number;
  trial_days: number;
  active: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await adminSupabase();
  if (!supabase) return { error: "Acesso negado" };

  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name: fields.name.trim().slice(0, 120),
      description: fields.description.trim().slice(0, 500) || null,
      price_monthly_cents: Math.max(0, Math.floor(fields.price_monthly_cents)),
      trial_days: Math.min(365, Math.max(0, Math.floor(fields.trial_days))),
      active: fields.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fields.id);

  if (error) return { error: error.message };
  revalidatePath("/app/admin/plans");
  return { ok: true };
}

export async function assignWorkspaceSubscription(
  workspaceId: string,
  planId: string,
  mode: "trial" | "active_monthly"
): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await adminSupabase();
  if (!supabase) return { error: "Acesso negado" };

  const { data: plan, error: pe } = await supabase
    .from("subscription_plans")
    .select("trial_days")
    .eq("id", planId)
    .maybeSingle();

  if (pe || !plan) return { error: "Plano não encontrado" };

  const now = new Date();
  let status: string;
  let trial_ends_at: string | null = null;
  let current_period_end: string | null = null;

  if (mode === "trial") {
    status = "trialing";
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + Math.max(1, Number(plan.trial_days) || 14));
    trial_ends_at = d.toISOString();
  } else {
    status = "active";
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() + 1);
    current_period_end = d.toISOString();
  }

  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const row = {
    plan_id: planId,
    status,
    trial_ends_at,
    current_period_end,
    updated_at: now.toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("workspace_subscriptions")
      .update(row)
      .eq("workspace_id", workspaceId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("workspace_subscriptions")
      .insert({
        workspace_id: workspaceId,
        ...row,
      });
    if (error) return { error: error.message };
  }

  revalidatePath("/app/admin/workspaces");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

export async function setProfileSuperAdmin(
  profileId: string,
  value: boolean
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await adminSupabase();
  if (!supabase || !user) return { error: "Acesso negado" };
  if (profileId === user.id && !value) {
    return { error: "Não pode remover o seu próprio super admin aqui." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_super_admin: value })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/app/admin/users");
  return { ok: true };
}
