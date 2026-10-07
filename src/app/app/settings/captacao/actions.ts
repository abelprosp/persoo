"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { userCanManageWorkspaceBilling } from "@/lib/workspace-billing";
import {
  generateApiToken,
  generateFormPublicId,
  mergeLeadCustomFields,
  parseIntakeFields,
  type IntakeField,
} from "@/lib/lead-intake";
import { revalidatePath } from "next/cache";

function refreshIntegrations() {
  revalidatePath("/app/settings/captacao");
  revalidatePath("/app/integrations");
}

async function managerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." as const };
  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado." as const };
  const can = await userCanManageWorkspaceBilling(supabase, user.id, active.id);
  if (!can) return { error: "Só o dono ou um administrador pode gerir a captação." as const };
  return { supabase, user, active };
}

async function persistCustomFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  schema: Record<string, unknown> | null,
  fields: IntakeField[]
) {
  const next = mergeLeadCustomFields(schema, [...fields, { target: "source", label: "Origem do lead", inboundKey: "source", required: false, custom: true, type: "text" }]);
  const { error } = await supabase
    .from("workspaces")
    .update({ ai_schema: next, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  return error?.message ?? null;
}

export async function createLeadApiKey(
  name: string,
  rawFields: IntakeField[],
  canExport = false
): Promise<{ ok: true; token: string } | { error: string }> {
  const ctx = await managerContext();
  if ("error" in ctx) return { error: ctx.error ?? "Não foi possível continuar." };
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    return { error: "Dê um nome à chave, até 80 caracteres." };
  }
  const fields = parseIntakeFields(rawFields);
  if ("error" in fields) return { error: fields.error };

  const { token, hash, prefix } = generateApiToken();
  const { error } = await ctx.supabase.from("lead_api_keys").insert({
    workspace_id: ctx.active.id,
    name: trimmed,
    token_hash: hash,
    token_prefix: prefix,
    fields,
    can_export: canExport,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  const schemaError = await persistCustomFields(
    ctx.supabase,
    ctx.active.id,
    (ctx.active.ai_schema as Record<string, unknown> | null) ?? null,
    fields
  );
  if (schemaError) return { error: schemaError };

  refreshIntegrations();
  revalidatePath("/app/leads");
  return { ok: true, token };
}

export async function revokeLeadApiKey(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const ctx = await managerContext();
  if ("error" in ctx) return { error: ctx.error ?? "Não foi possível continuar." };
  const { error } = await ctx.supabase
    .from("lead_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.active.id);
  if (error) return { error: error.message };
  refreshIntegrations();
  return { ok: true };
}

export async function createLeadForm(
  name: string,
  rawFields: IntakeField[]
): Promise<{ ok: true; publicId: string } | { error: string }> {
  const ctx = await managerContext();
  if ("error" in ctx) return { error: ctx.error ?? "Não foi possível continuar." };
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    return { error: "Dê um nome ao formulário, até 80 caracteres." };
  }
  const fields = parseIntakeFields(rawFields);
  if ("error" in fields) return { error: fields.error };

  const publicId = generateFormPublicId();
  const { error } = await ctx.supabase.from("lead_forms").insert({
    workspace_id: ctx.active.id,
    name: trimmed,
    public_id: publicId,
    fields,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  const schemaError = await persistCustomFields(
    ctx.supabase,
    ctx.active.id,
    (ctx.active.ai_schema as Record<string, unknown> | null) ?? null,
    fields
  );
  if (schemaError) return { error: schemaError };

  refreshIntegrations();
  revalidatePath("/app/leads");
  return { ok: true, publicId };
}

export async function disableLeadForm(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const ctx = await managerContext();
  if ("error" in ctx) return { error: ctx.error ?? "Não foi possível continuar." };
  const { error } = await ctx.supabase
    .from("lead_forms")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.active.id);
  if (error) return { error: error.message };
  refreshIntegrations();
  return { ok: true };
}
