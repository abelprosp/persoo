import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  getCustomFields,
  getEntityLabel,
} from "@/lib/ai-schema";
import {
  firstTaskStatusId,
  getTaskKanbanCardVisibility,
  getTaskKanbanColumns,
  withOrphanKanbanColumns,
} from "@/lib/kanban-schema";
import { TasksPageClient } from "@/app/app/tasks/tasks-page-client";
import { redirect } from "next/navigation";

export default async function TasksPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const pipeline = getTaskKanbanColumns(schema);
  const firstStatus = firstTaskStatusId(schema);
  const taskCardVisibility = getTaskKanbanCardVisibility(schema);
  const extraCols = getCustomFields(schema, "tasks");
  const taskFieldLabels = {
    title: getEntityLabel(schema, "tasks", "title", "Título"),
    status: getEntityLabel(schema, "tasks", "status", "Estado"),
    priority: getEntityLabel(schema, "tasks", "priority", "Prioridade"),
    due_at: getEntityLabel(schema, "tasks", "due_at", "Prazo"),
    assignee_name: getEntityLabel(
      schema,
      "tasks",
      "assignee_name",
      "Atribuído"
    ),
  };

  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", ws.id)
    .order("updated_at", { ascending: false });
  const list = rows ?? [];

  const byCol: Record<string, Record<string, unknown>[]> = {};
  for (const col of pipeline) byCol[col.id] = [];
  for (const row of list) {
    const st = row.status ?? firstStatus;
    if (!byCol[st]) byCol[st] = [];
    byCol[st].push(row);
  }

  const kanbanColumns = withOrphanKanbanColumns(pipeline, byCol);
  const createStatusOptions = pipeline.map((c) => ({ id: c.id, label: c.title }));
  const kanbanEditableColumns = pipeline.map(({ id, title }) => ({ id, title }));

  return (
    <TasksPageClient
      kanbanColumns={kanbanColumns}
      kanbanEditableColumns={kanbanEditableColumns}
      createStatusOptions={createStatusOptions}
      firstCreateStatusId={firstStatus}
      itemsByColumn={byCol}
      customFields={extraCols}
      fieldLabels={taskFieldLabels}
      cardVisibility={taskCardVisibility}
    />
  );
}
