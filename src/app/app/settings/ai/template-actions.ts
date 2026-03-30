"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import {
  getCrmTemplateSchema,
  isCrmTemplateId,
  type CrmTemplateId,
} from "@/lib/crm-templates";

const PRESERVED_SCHEMA_KEYS = [
  "dashboard",
  "ai_customize_trial_used",
  "ai_customize_pro_used",
  "ai_customize_pro_month",
] as const;

export type ApplyCrmTemplateResult = { ok: true } | { error: string };

/**
 * Aplica um template vertical ao workspace: menu, rótulos, campos extra e kanbans.
 * Mantém dashboard do workspace, créditos de personalização IA e preferências de cartões kanban (se existirem).
 */
export async function applyCrmTemplate(
  templateId: string
): Promise<ApplyCrmTemplateResult> {
  if (!isCrmTemplateId(templateId)) {
    return { error: "Template inválido" };
  }

  const id = templateId as CrmTemplateId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const prev =
    active.ai_schema &&
    typeof active.ai_schema === "object" &&
    !Array.isArray(active.ai_schema)
      ? (active.ai_schema as Record<string, unknown>)
      : {};

  const templateFull = getCrmTemplateSchema(id) as Record<string, unknown>;
  const templateKanban =
    templateFull.kanban &&
    typeof templateFull.kanban === "object" &&
    !Array.isArray(templateFull.kanban)
      ? (templateFull.kanban as Record<string, unknown>)
      : {};

  const prevKanban =
    prev.kanban &&
    typeof prev.kanban === "object" &&
    !Array.isArray(prev.kanban)
      ? ({
          ...(prev.kanban as Record<string, unknown>),
        } as Record<string, unknown>)
      : {};

  const nextKanban: Record<string, unknown> = { ...prevKanban };
  if (Array.isArray(templateKanban.leads)) {
    nextKanban.leads = templateKanban.leads;
  }
  if (Array.isArray(templateKanban.deals)) {
    nextKanban.deals = templateKanban.deals;
  }
  if (Array.isArray(templateKanban.tasks)) {
    nextKanban.tasks = templateKanban.tasks;
  }

  const { kanban: _drop, ...templateRest } = templateFull;
  const industryStr =
    typeof templateFull.industry === "string" && templateFull.industry.trim()
      ? templateFull.industry.trim()
      : "Geral";

  const nextSchema: Record<string, unknown> = {
    ...templateRest,
    industry: industryStr,
    kanban: nextKanban,
  };

  for (const k of PRESERVED_SCHEMA_KEYS) {
    if (k in prev) nextSchema[k] = prev[k];
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      industry: industryStr,
      ai_schema: nextSchema,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/leads");
  revalidatePath("/app/deals");
  revalidatePath("/app/tasks");
  revalidatePath("/app/contacts");
  revalidatePath("/app/organizations");
  revalidatePath("/app/products");
  revalidatePath("/app/notes");
  revalidatePath("/app/settings/ai");

  return { ok: true };
}
