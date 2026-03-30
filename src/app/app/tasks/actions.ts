"use server";

import { createClient } from "@/lib/supabase/server";
import {
  customDataFromForm,
  getCustomFields,
} from "@/lib/ai-schema";
import { allowedTaskStatusSet, firstTaskStatusId } from "@/lib/kanban-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createTask(formData: FormData): Promise<ActionResult> {
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
    return { error: "Indique o título da tarefa" };
  }

  const schema = active.ai_schema as Record<string, unknown> | null;
  const allowedStatus = allowedTaskStatusSet(schema);
  const fallbackStatus = firstTaskStatusId(schema);
  const rawStatus = String(formData.get("status") ?? fallbackStatus).trim();
  const status = allowedStatus.has(rawStatus) ? rawStatus : fallbackStatus;

  const allowedPri = new Set(["low", "medium", "high"]);
  const rawPri = String(formData.get("priority") ?? "medium").trim();
  const priority = allowedPri.has(rawPri) ? rawPri : "medium";

  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const due_at = dueRaw === "" ? null : new Date(dueRaw).toISOString();
  if (dueRaw !== "" && Number.isNaN(new Date(dueRaw).getTime())) {
    return { error: "Data inválida" };
  }

  const assignee_name =
    String(formData.get("assignee_name") ?? "").trim() || null;

  const extraFields = getCustomFields(schema, "tasks");
  const custom_data = customDataFromForm(formData, extraFields);

  const now = new Date().toISOString();

  const { error } = await supabase.from("tasks").insert({
    workspace_id: active.id,
    title,
    status,
    priority,
    due_at,
    assignee_name,
    updated_at: now,
    custom_data: Object.keys(custom_data).length > 0 ? custom_data : {},
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/tasks");
  return { ok: true };
}
