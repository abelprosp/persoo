"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

const ENTITIES = [
  "leads",
  "deals",
  "contacts",
  "organizations",
  "products",
  "notes",
  "tasks",
] as const;

export type ActiveEntity = (typeof ENTITIES)[number];

const PATHS = [
  "/app/dashboard",
  "/app/leads",
  "/app/deals",
  "/app/contacts",
  "/app/organizations",
  "/app/products",
  "/app/notes",
  "/app/tasks",
];

export async function setRecordActive(
  entity: ActiveEntity,
  id: string,
  active: boolean
): Promise<ActionResult> {
  if (!ENTITIES.includes(entity)) return { error: "Registo inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active: workspace } = await getWorkspaceContext(supabase, user.id);
  if (!workspace) return { error: "Espaço de trabalho não encontrado" };

  const recordId = String(id ?? "").trim();
  if (!recordId) return { error: "Registo inválido" };

  const { error } = await supabase
    .from(entity)
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .eq("workspace_id", workspace.id);

  if (error) return { error: error.message };

  for (const path of PATHS) revalidatePath(path);
  return { ok: true };
}
