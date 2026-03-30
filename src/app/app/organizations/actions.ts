"use server";

import { createClient } from "@/lib/supabase/server";
import {
  customDataFromForm,
  getCustomFields,
} from "@/lib/ai-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createOrganization(
  formData: FormData
): Promise<ActionResult> {
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

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Indique o nome da organização" };
  }

  const website = String(formData.get("website") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  const revenueRaw = String(formData.get("annual_revenue") ?? "").trim();
  let annual_revenue: number | null = null;
  if (revenueRaw !== "") {
    const n = Number.parseFloat(revenueRaw.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      return { error: "Receita anual inválida" };
    }
    annual_revenue = n;
  }

  const schema = active.ai_schema as Record<string, unknown> | null;
  const extraFields = getCustomFields(schema, "organizations");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("organizations").insert({
    workspace_id: active.id,
    name,
    website,
    industry,
    logo_url,
    annual_revenue,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
    updated_at: now,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/organizations");
  revalidatePath("/app/contacts");
  return { ok: true };
}
