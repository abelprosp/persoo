import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToCardEnrichment } from "@/lib/card-enrichment";

export async function attachCardEnrichmentsToRows(
  supabase: SupabaseClient,
  workspaceId: string,
  entityType: "lead" | "deal" | "task",
  rows: Record<string, unknown>[]
): Promise<void> {
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  if (ids.length === 0) return;

  const { data, error } = await supabase
    .from("card_enrichments")
    .select("entity_id,checklists,documents,team_members,labels")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .in("entity_id", ids);

  if (error) throw new Error(error.message);

  const map = new Map(
    (data ?? []).map((row) => [row.entity_id as string, row])
  );
  for (const row of rows) {
    const id = row.id as string;
    const found = map.get(id);
    row.card_enrichment = found
      ? rowToCardEnrichment(found)
      : null;
  }
}
