"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState(firstCreateStatusId);

  useEffect(() => {
    setDefaultStatus(firstCreateStatusId);
  }, [firstCreateStatusId]);

  function openCreate(columnId: string) {
    setDefaultStatus(columnId);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Tarefas"
        viewLabel="Kanban"
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
              showTrigger={false}
            />
          </div>
        }
        toolbar={
          <PageToolbar
            variant="kanban"
            kanbanExtra={
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
            }
          />
        }
      />
      <KanbanBoard
        variant="task"
        columns={kanbanColumns}
        itemsByColumn={itemsByColumn}
        customFields={customFields}
        cardVisibility={cardVisibility}
        onAddClick={openCreate}
      />
    </div>
  );
}
