"use server";

import { createClient } from "@/lib/supabase/server";
import {
  customDataFromForm,
  getCustomFields,
} from "@/lib/ai-schema";
import {
  allowedLeadStatusSet,
  firstLeadStatusId,
} from "@/lib/kanban-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createLead(formData: FormData): Promise<ActionResult> {
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

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) {
    return { error: "Indique o nome do lead" };
  }

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  const owner_name = String(formData.get("owner_name") ?? "").trim() || null;
  const schema = active.ai_schema as Record<string, unknown> | null;
  const allowed = allowedLeadStatusSet(schema);
  const fallbackStatus = firstLeadStatusId(schema);
  const rawStatus = String(formData.get("status") ?? fallbackStatus).trim();
  const status = allowed.has(rawStatus) ? rawStatus : fallbackStatus;

  const extraFields = getCustomFields(schema, "leads");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("leads").insert({
    workspace_id: active.id,
    full_name,
    email,
    phone,
    company,
    owner_name,
    status,
    last_activity_at: now,
    updated_at: now,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/leads");
  return { ok: true };
}
