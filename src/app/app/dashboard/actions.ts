"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type KpiId,
  KPI_DEFINITIONS,
} from "@/lib/dashboard-prefs";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

const ALLOWED = new Set<KpiId>(KPI_DEFINITIONS.map((d) => d.id));

export type SaveDashboardResult = { ok: true } | { error: string };

export async function saveDashboardPreferences(data: {
  labels: Record<string, string>;
  hiddenKpis: string[];
}): Promise<SaveDashboardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const kpiLabels: Partial<Record<KpiId, string>> = {};
  for (const def of KPI_DEFINITIONS) {
    const v = data.labels[def.id];
    if (typeof v === "string" && v.trim()) {
      kpiLabels[def.id] = v.trim().slice(0, 120);
    }
  }

  const hiddenKpis = data.hiddenKpis.filter((id): id is KpiId =>
    ALLOWED.has(id as KpiId)
  );

  const prev =
    (active.ai_schema as Record<string, unknown> | null | undefined) ?? {};
  const prevDash =
    prev.dashboard && typeof prev.dashboard === "object" &&
    !Array.isArray(prev.dashboard)
      ? (prev.dashboard as Record<string, unknown>)
      : {};

  const nextDashboard: Record<string, unknown> = {
    ...prevDash,
    kpiLabels,
    hiddenKpis,
  };

  const nextSchema = {
    ...prev,
    dashboard: nextDashboard,
  };

  const { error } = await supabase
    .from("workspaces")
    .update({
      ai_schema: nextSchema as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/dashboard");
  return { ok: true };
}
