"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreateTaskDialog,
  type TaskFormFieldLabels,
  type TaskStatusOption,
} from "@/components/crm/create-task-dialog";
import { PageHeader } from "@/components/crm/page-header";
import { PageToolbar } from "@/components/crm/page-toolbar";
import {
  KanbanBoard,
  type KanbanColumnDef,
} from "@/components/crm/kanban-board";
import { KanbanCustomizeControl } from "@/components/crm/kanban-customize-dialog";
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";
import {
  TaskCalendarView,
  type TaskCalendarItem,
} from "@/components/crm/task-calendar-view";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { TaskKanbanCardVisibility } from "@/lib/kanban-schema";

type Props = {
  kanbanColumns: KanbanColumnDef[];
  kanbanEditableColumns: { id: string; title: string }[];
  createStatusOptions: TaskStatusOption[];
  firstCreateStatusId: string;
  itemsByColumn: Record<string, Record<string, unknown>[]>;
  customFields: CustomFieldDef[];
  fieldLabels: TaskFormFieldLabels;
  cardVisibility: TaskKanbanCardVisibility;
};

export function TasksPageClient({
  kanbanColumns,
  kanbanEditableColumns,
  createStatusOptions,
  firstCreateStatusId,
  itemsByColumn,
  customFields,
  fieldLabels,
  cardVisibility,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState(firstCreateStatusId);
  const [defaultDueAt, setDefaultDueAt] = useState("");
  const [activeView, setActiveView] = useState<"kanban" | "calendar">("kanban");

  useEffect(() => {
    setDefaultStatus(firstCreateStatusId);
  }, [firstCreateStatusId]);

  function openCreate(columnId: string) {
    setDefaultStatus(columnId);
    setDefaultDueAt("");
    setCreateOpen(true);
  }

  function openCreateFromDay(dateYmd: string) {
    // Predefine 09:00 no dia clicado; o utilizador pode ajustar o horário.
    setDefaultStatus(firstCreateStatusId);
    setDefaultDueAt(`${dateYmd}T09:00`);
    setCreateOpen(true);
  }

  async function moveCard(
    itemId: string,
    fromColumn: string,
    toColumn: string
  ): Promise<boolean> {
    const res = await fetch("/api/kanban/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant: "task",
        id: itemId,
        fromColumn,
        toColumn,
      }),
    });
    if (!res.ok) return false;
    router.refresh();
    return true;
  }

  const calendarItems: TaskCalendarItem[] = [];
  for (const raw of Object.values(itemsByColumn).flat()) {
    const id = String(raw.id ?? "");
    const title = String(raw.title ?? "").trim();
    const dueAtIso = String(raw.due_at ?? "").trim();
    if (!id || !title || !dueAtIso) continue;
    const dueDate = new Date(dueAtIso);
    if (Number.isNaN(dueDate.getTime())) continue;
    calendarItems.push({
      id,
      title,
      dueAtIso: dueDate.toISOString(),
      status: String(raw.status ?? ""),
      priority: String(raw.priority ?? "medium"),
      assigneeName:
        raw.assignee_name == null ? null : String(raw.assignee_name),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Tarefas"
        viewLabel={activeView === "kanban" ? "Kanban" : "Calendário"}
        createSlot={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => openCreate(firstCreateStatusId)}
            >
              <Plus className="mr-2 size-4" />
              Criar
            </Button>
            <AiModuleCustomizeButton module="tasks" title="Tarefas" />
            <CreateTaskDialog
              statusOptions={createStatusOptions}
              customFields={customFields}
              fieldLabels={fieldLabels}
              open={createOpen}
              onOpenChange={setCreateOpen}
              defaultStatus={defaultStatus}
              defaultDueAt={defaultDueAt}
              showTrigger={false}
            />
          </div>
        }
        toolbar={
          <PageToolbar
            variant="kanban"
            kanbanExtra={
              activeView === "kanban" ? (
                <KanbanCustomizeControl
                  board="tasks"
                  initialColumns={kanbanEditableColumns}
                  cardVisibility={cardVisibility}
                  fieldLabels={{
                    status: fieldLabels.status ?? "Estado",
                    priority: fieldLabels.priority ?? "Prioridade",
                    due_at: fieldLabels.due_at ?? "Prazo",
                    assignee_name: fieldLabels.assignee_name ?? "Atribuído",
                  }}
                />
              ) : undefined
            }
          />
        }
      />
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "kanban" | "calendar")}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <KanbanBoard
            variant="task"
            columns={kanbanColumns}
            itemsByColumn={itemsByColumn}
            customFields={customFields}
            cardVisibility={cardVisibility}
            onAddClick={openCreate}
            onMoveCard={moveCard}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <TaskCalendarView
            items={calendarItems}
            onCreateClick={() => openCreate(firstCreateStatusId)}
            onDayClick={openCreateFromDay}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
