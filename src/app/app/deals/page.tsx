import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCustomFields, getEntityLabel } from "@/lib/ai-schema";
import {
  firstDealStageId,
  getDealKanbanCardVisibility,
  getDealKanbanColumns,
  withOrphanKanbanColumns,
} from "@/lib/kanban-schema";
import { DealsPageClient } from "@/app/app/deals/deals-page-client";
import { attachCardEnrichmentsToRows } from "@/lib/load-card-enrichments";
import { redirect } from "next/navigation";

export default async function DealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const pipeline = getDealKanbanColumns(schema);
  const firstStage = firstDealStageId(schema);
  const dealCustomFields = getCustomFields(schema, "deals");
  const dealFieldLabels = {
    title: getEntityLabel(schema, "deals", "title", "Título"),
    value: getEntityLabel(schema, "deals", "value", "Valor (R$)"),
    stage: getEntityLabel(schema, "deals", "stage", "Etapa inicial"),
    organization_name: getEntityLabel(
      schema,
      "deals",
      "organization_name",
      "Organização"
    ),
    email: getEntityLabel(schema, "deals", "email", "E-mail"),
    phone: getEntityLabel(schema, "deals", "phone", "Telefone"),
    assignee_name: getEntityLabel(
      schema,
      "deals",
      "assignee_name",
      "Responsável"
    ),
  };

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("workspace_id", ws.id);

  const items = deals ?? [];
  const byCol: Record<string, Record<string, unknown>[]> = {};
  for (const col of pipeline) {
    byCol[col.id] = [];
  }
  for (const row of items) {
    const st = row.stage ?? firstStage;
    if (!byCol[st]) byCol[st] = [];
    byCol[st].push(row);
  }

  const allRows = Object.values(byCol).flat() as Record<string, unknown>[];
  await attachCardEnrichmentsToRows(supabase, ws.id, "deal", allRows);

  const kanbanColumns = withOrphanKanbanColumns(pipeline, byCol);
  const createStageOptions = pipeline.map((c) => ({
    id: c.id,
    label: c.title,
  }));
  const kanbanEditableColumns = pipeline.map(({ id, title }) => ({ id, title }));
  const dealCardVisibility = getDealKanbanCardVisibility(schema);

  return (
    <DealsPageClient
      kanbanColumns={kanbanColumns}
      kanbanEditableColumns={kanbanEditableColumns}
      createStageOptions={createStageOptions}
      firstCreateStageId={firstStage}
      itemsByColumn={byCol}
      customFields={dealCustomFields}
      fieldLabels={dealFieldLabels}
      cardVisibility={dealCardVisibility}
    />
  );
}
