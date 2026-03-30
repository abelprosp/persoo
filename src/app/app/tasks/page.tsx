import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  formatCustomFieldValue,
  getCustomFields,
  getEntityLabel,
  readRowCustomData,
} from "@/lib/ai-schema";
import { CreateTaskDialog } from "@/components/crm/create-task-dialog";
import { PageHeader } from "@/components/crm/page-header";
import {
  PageToolbar,
  type ListSortOption,
} from "@/components/crm/page-toolbar";
import { UrlQuerySelect } from "@/components/crm/url-query-select";
import { DataTableFooter } from "@/components/crm/table-footer";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/format";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import {
  sanitizeIlikeTerm,
  parseHideSet,
  pickSortId,
  resolveSortOption,
  countVisibleTableColumns,
} from "@/lib/list-toolbar-url";

const TASK_SORT: ListSortOption[] = [
  {
    id: "due_asc",
    label: "Prazo (mais próximo)",
    column: "due_at",
    ascending: true,
  },
  {
    id: "updated_desc",
    label: "Última alteração (recente)",
    column: "updated_at",
    ascending: false,
  },
  {
    id: "title_asc",
    label: "Título A-Z",
    column: "title",
    ascending: true,
  },
  {
    id: "status_asc",
    label: "Estado A-Z",
    column: "status",
    ascending: true,
  },
];

const FIXED_COL_IDS = [
  "title",
  "status",
  "priority",
  "due",
  "assignee",
  "updated",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "done")
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">
        ✓
      </span>
    );
  if (s === "in_progress")
    return (
      <span
        className="inline-block size-4 rounded-full border-2 border-zinc-900 bg-zinc-900/40"
        title="Em progresso"
      />
    );
  if (s === "backlog")
    return (
      <span
        className="inline-block size-4 rounded-full border-2 border-dashed border-muted-foreground"
        title="Backlog"
      />
    );
  return (
    <span
      className="inline-block size-4 rounded-full border-2 border-muted-foreground"
      title="A fazer"
    />
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sanitizeIlikeTerm(typeof sp.q === "string" ? sp.q : "");
  const hide = parseHideSet(sp.hide);
  const sortId = pickSortId(
    TASK_SORT,
    typeof sp.sort === "string" ? sp.sort : undefined,
    "due_asc"
  );
  const sortOpt = resolveSortOption(TASK_SORT, sortId);
  const statusFilter =
    typeof sp.status === "string" && sp.status !== "all" ? sp.status : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const extraCols = getCustomFields(schema, "tasks");
  const extraKeys = extraCols.map((f) => f.key);
  const colCount = countVisibleTableColumns(hide, [...FIXED_COL_IDS], extraKeys);

  const lblTitle = getEntityLabel(schema, "tasks", "title", "Título");
  const lblStatus = getEntityLabel(schema, "tasks", "status", "Estado");
  const lblPriority = getEntityLabel(schema, "tasks", "priority", "Prioridade");
  const lblDue = getEntityLabel(schema, "tasks", "due_at", "Prazo");
  const lblAssignee = getEntityLabel(
    schema,
    "tasks",
    "assignee_name",
    "Atribuído"
  );

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

  let query = supabase.from("tasks").select("*").eq("workspace_id", ws.id);
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (q) {
    const p = `%${q}%`;
    query = query.or(`title.ilike.${p},assignee_name.ilike.${p}`);
  }
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const { data: rows } = await query;
  const list = rows ?? [];

  const vis = (id: string) => !hide.has(id);

  const toolbarColumns = [
    { id: "title", label: lblTitle },
    { id: "status", label: lblStatus },
    { id: "priority", label: lblPriority },
    { id: "due", label: lblDue },
    { id: "assignee", label: lblAssignee },
    ...extraCols.map((f) => ({ id: `extra:${f.key}`, label: f.label })),
    { id: "updated", label: "Última alteração" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Tarefas"
        viewLabel="Lista"
        createSlot={
          <CreateTaskDialog
            customFields={extraCols}
            fieldLabels={taskFieldLabels}
          />
        }
        toolbar={
          <PageToolbar
            sortOptions={TASK_SORT}
            columns={toolbarColumns}
            defaultSortId="due_asc"
            searchPlaceholder="Título ou atribuído…"
          />
        }
        filtersLeft={
          <UrlQuerySelect
            param="status"
            className="w-[160px] bg-white"
            options={[
              { value: "all", label: "Todos" },
              { value: "todo", label: "A fazer" },
              { value: "in_progress", label: "Em progresso" },
              { value: "done", label: "Concluído" },
            ]}
          />
        }
      />
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox disabled />
              </TableHead>
              {vis("title") ? <TableHead>{lblTitle}</TableHead> : null}
              {vis("status") ? <TableHead>{lblStatus}</TableHead> : null}
              {vis("priority") ? <TableHead>{lblPriority}</TableHead> : null}
              {vis("due") ? <TableHead>{lblDue}</TableHead> : null}
              {vis("assignee") ? <TableHead>{lblAssignee}</TableHead> : null}
              {extraCols.map(
                (f) =>
                  vis(`extra:${f.key}`) ? (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ) : null
              )}
              {vis("updated") ? (
                <TableHead>Última alteração</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sem tarefas.
                </TableCell>
              </TableRow>
            ) : (
              list.map((t) => {
                const custom = readRowCustomData(t);
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Checkbox disabled />
                    </TableCell>
                    {vis("title") ? (
                      <TableCell className="font-medium">{t.title}</TableCell>
                    ) : null}
                    {vis("status") ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon status={t.status} />
                          <span className="capitalize">
                            {t.status?.replace("_", " ") ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                    ) : null}
                    {vis("priority") ? (
                      <TableCell>
                        <span
                          className={cn(
                            t.priority === "high" && "font-medium text-orange-700"
                          )}
                        >
                          {t.priority === "high"
                            ? "Alta"
                            : t.priority === "low"
                              ? "Baixa"
                              : "Média"}
                        </span>
                      </TableCell>
                    ) : null}
                    {vis("due") ? (
                      <TableCell className="text-muted-foreground">
                        {t.due_at ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {new Date(t.due_at).toLocaleDateString("pt-PT", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ) : null}
                    {vis("assignee") ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[9px]">
                              {t.assignee_name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          {t.assignee_name ?? "—"}
                        </div>
                      </TableCell>
                    ) : null}
                    {extraCols.map(
                      (f) =>
                        vis(`extra:${f.key}`) ? (
                          <TableCell
                            key={f.key}
                            className="text-muted-foreground"
                          >
                            {formatCustomFieldValue(custom[f.key], f.type)}
                          </TableCell>
                        ) : null
                    )}
                    {vis("updated") ? (
                      <TableCell className="text-muted-foreground">
                        {relativeTime(t.updated_at)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <DataTableFooter total={list.length} />
      </div>
    </div>
  );
}
