"use server";

import { createClient } from "@/lib/supabase/server";
import {
  customDataFromForm,
  getCustomFields,
} from "@/lib/ai-schema";
import {
  allowedDealStageSet,
  firstDealStageId,
} from "@/lib/kanban-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createDeal(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Não autenticado" };
  }

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) {
    return { error: "Espaço de trabalho não encontrado" };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Indique o título do negócio" };
  }

  const valueRaw = String(formData.get("value") ?? "").trim();
  const parsed =
    valueRaw === "" ? 0 : Number.parseFloat(valueRaw.replace(",", "."));
  if (Number.isNaN(parsed) || parsed < 0) {
    return { error: "Valor inválido" };
  }
  const value = parsed;

  const schema = active.ai_schema as Record<string, unknown> | null;
  const allowedStages = allowedDealStageSet(schema);
  const fallbackStage = firstDealStageId(schema);
  const rawStage = String(formData.get("stage") ?? fallbackStage).trim();
  const stage = allowedStages.has(rawStage) ? rawStage : fallbackStage;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const assignee_name =
    String(formData.get("assignee_name") ?? "").trim() || null;
  const organization_name =
    String(formData.get("organization_name") ?? "").trim() || null;

  const extraFields = getCustomFields(schema, "deals");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("deals").insert({
    workspace_id: active.id,
    title,
    value,
    stage,
    email,
    phone,
    assignee_name,
    organization_name,
    last_updated: now,
    updated_at: now,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/deals");
  return { ok: true };
}
