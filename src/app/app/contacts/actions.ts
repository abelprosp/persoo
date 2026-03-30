"use server";

import { createClient } from "@/lib/supabase/server";
import { customDataFromForm, getCustomFields } from "@/lib/ai-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createContact(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const orgRaw = String(formData.get("organization_id") ?? "").trim();
  const organization_id = orgRaw === "" ? null : orgRaw;

  if (!email && !phone) {
    return { error: "Indique pelo menos e-mail ou telefone" };
  }

  const schema = active.ai_schema as Record<string, unknown> | null;
  const extraFields = getCustomFields(schema, "contacts");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("contacts").insert({
    workspace_id: active.id,
    email,
    phone,
    organization_id,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
    updated_at: now,
  });

  if (error) return { error: error.message };

  revalidatePath("/app/contacts");
  return { ok: true };
}

export async function updateContact(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Contacto inválido" };

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const orgRaw = String(formData.get("organization_id") ?? "").trim();
  const organization_id = orgRaw === "" ? null : orgRaw;

  if (!email && !phone) {
    return { error: "Indique pelo menos e-mail ou telefone" };
  }

  const schema = active.ai_schema as Record<string, unknown> | null;
  const extraFields = getCustomFields(schema, "contacts");
  const custom_data = customDataFromForm(formData, extraFields);

  const { error } = await supabase
    .from("contacts")
    .update({
      email,
      phone,
      organization_id,
      custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/contacts");
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const cid = String(id ?? "").trim();
  if (!cid) return { error: "Contacto inválido" };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", cid)
    .eq("workspace_id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/contacts");
  return { ok: true };
}
