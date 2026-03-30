import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { getCustomFields, getEntityLabel } from "@/lib/ai-schema";
import {
  firstLeadStatusId,
  getLeadKanbanCardVisibility,
  getLeadKanbanColumns,
  withOrphanKanbanColumns,
} from "@/lib/kanban-schema";
import { LeadsPageClient } from "@/app/app/leads/leads-page-client";
import { attachCardEnrichmentsToRows } from "@/lib/load-card-enrichments";
import { redirect } from "next/navigation";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const pipeline = getLeadKanbanColumns(schema);
  const firstStatus = firstLeadStatusId(schema);
  const leadCustomFields = getCustomFields(schema, "leads");
  const leadFieldLabels = {
    full_name: getEntityLabel(schema, "leads", "full_name", "Nome"),
    email: getEntityLabel(schema, "leads", "email", "E-mail"),
    phone: getEntityLabel(schema, "leads", "phone", "Telefone"),
    company: getEntityLabel(schema, "leads", "company", "Empresa"),
    owner_name: getEntityLabel(schema, "leads", "owner_name", "Responsável"),
    status: getEntityLabel(schema, "leads", "status", "Coluna inicial"),
  };

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", ws.id);

  const items = leads ?? [];
  const byCol: Record<string, Record<string, unknown>[]> = {};
  for (const col of pipeline) {
    byCol[col.id] = [];
  }
  for (const row of items) {
    const st = row.status ?? firstStatus;
    if (!byCol[st]) byCol[st] = [];
    byCol[st].push(row);
  }

  const allRows = Object.values(byCol).flat() as Record<string, unknown>[];
  await attachCardEnrichmentsToRows(supabase, ws.id, "lead", allRows);

  const kanbanColumns = withOrphanKanbanColumns(pipeline, byCol);
  const createStatusOptions = pipeline.map((c) => ({
    id: c.id,
    label: c.title,
  }));
  const kanbanEditableColumns = pipeline.map(({ id, title }) => ({ id, title }));
  const leadCardVisibility = getLeadKanbanCardVisibility(schema);

  return (
    <LeadsPageClient
      kanbanColumns={kanbanColumns}
      kanbanEditableColumns={kanbanEditableColumns}
      createStatusOptions={createStatusOptions}
      firstCreateStatusId={firstStatus}
      itemsByColumn={byCol}
      customFields={leadCustomFields}
      fieldLabels={leadFieldLabels}
      cardVisibility={leadCardVisibility}
    />
  );
}
