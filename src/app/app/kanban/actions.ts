"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import {
  DEAL_KANBAN_CARD_FIELD_KEYS,
  LEAD_KANBAN_CARD_FIELD_KEYS,
  slugifyKanbanId,
} from "@/lib/kanban-schema";

export type SaveKanbanResult = { ok: true } | { error: string };

const MIN_COLS = 2;
const MAX_COLS = 12;

function sanitizeColumns(
  input: { id: string; title: string }[]
):
  | { ok: true; columns: { id: string; title: string }[] }
  | { ok: false; error: string } {
  const out: { id: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const idRaw = typeof raw.id === "string" ? raw.id.trim() : "";
    const titleRaw = typeof raw.title === "string" ? raw.title.trim() : "";
    let id = slugifyKanbanId(idRaw) || slugifyKanbanId(titleRaw);
    if (!id) continue;
    let n = 0;
    let candidate = id;
    while (seen.has(candidate)) {
      n += 1;
      candidate = `${id}_${n}`;
    }
    seen.add(candidate);
    const title =
      titleRaw.length > 0 ? titleRaw.slice(0, 80) : candidate.replace(/_/g, " ");
    out.push({ id: candidate, title });
  }
  if (out.length < MIN_COLS) {
    return {
      ok: false,
      error: `É necessário pelo menos ${MIN_COLS} colunas.`,
    };
  }
  if (out.length > MAX_COLS) {
    return { ok: false, error: `No máximo ${MAX_COLS} colunas.` };
  }
  return { ok: true, columns: out };
}

function sanitizeLeadCardFields(
  raw: Record<string, boolean> | undefined
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of LEAD_KANBAN_CARD_FIELD_KEYS) {
    out[k] = typeof raw?.[k] === "boolean" ? raw[k]! : true;
  }
  return out;
}

function sanitizeDealCardFields(
  raw: Record<string, boolean> | undefined
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of DEAL_KANBAN_CARD_FIELD_KEYS) {
    out[k] = typeof raw?.[k] === "boolean" ? raw[k]! : true;
  }
  return out;
}

export async function saveKanbanCustomize(data: {
  board: "leads" | "deals";
  columns: { id: string; title: string }[];
  cardFields: Record<string, boolean>;
}): Promise<SaveKanbanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const colResult = sanitizeColumns(data.columns);
  if (!colResult.ok) return { error: colResult.error };
  const columns = colResult.columns;

  const prev =
    (active.ai_schema as Record<string, unknown> | null | undefined) ?? {};
  const prevKanban =
    prev.kanban && typeof prev.kanban === "object" && !Array.isArray(prev.kanban)
      ? ({ ...(prev.kanban as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  const nextKanban: Record<string, unknown> = { ...prevKanban };

  if (data.board === "leads") {
    nextKanban.leads = columns;
    nextKanban.leadCardFields = sanitizeLeadCardFields(data.cardFields);
  } else {
    nextKanban.deals = columns;
    nextKanban.dealCardFields = sanitizeDealCardFields(data.cardFields);
  }

  const nextSchema = {
    ...prev,
    kanban: nextKanban,
  };

  const { error } = await supabase
    .from("workspaces")
    .update({
      ai_schema: nextSchema as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/leads");
  revalidatePath("/app/deals");
  revalidatePath("/app", "layout");
  return { ok: true };
}
