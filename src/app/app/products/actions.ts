"use server";

import { createClient } from "@/lib/supabase/server";
import {
  customDataFromForm,
  getCustomFields,
} from "@/lib/ai-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createProduct(formData: FormData): Promise<ActionResult> {
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
    return { error: "Indique o nome" };
  }

  const sku = String(formData.get("sku") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  const priceRaw = String(formData.get("unit_price") ?? "").trim();
  let unit_price = 0;
  if (priceRaw !== "") {
    const n = Number.parseFloat(priceRaw.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      return { error: "Preço inválido" };
    }
    unit_price = n;
  }

  const schema = active.ai_schema as Record<string, unknown> | null;
  const extraFields = getCustomFields(schema, "products");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("products").insert({
    workspace_id: active.id,
    name,
    sku,
    description,
    unit_price,
    updated_at: now,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/products");
  return { ok: true };
}
