"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateDealDialog,
  type DealFormFieldLabels,
  type StageOption,
} from "@/components/crm/create-deal-dialog";
import { PageHeader } from "@/components/crm/page-header";
import { PageToolbar } from "@/components/crm/page-toolbar";
import {
  KanbanBoard,
  type KanbanColumnDef,
} from "@/components/crm/kanban-board";
import { KanbanCustomizeControl } from "@/components/crm/kanban-customize-dialog";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { DealKanbanCardVisibility } from "@/lib/kanban-schema";

type Props = {
  kanbanColumns: KanbanColumnDef[];
  kanbanEditableColumns: { id: string; title: string }[];
  createStageOptions: StageOption[];
  firstCreateStageId: string;
  itemsByColumn: Record<string, Record<string, unknown>[]>;
  customFields: CustomFieldDef[];
  fieldLabels: DealFormFieldLabels;
  cardVisibility: DealKanbanCardVisibility;
};

export function DealsPageClient({
  kanbanColumns,
  kanbanEditableColumns,
  createStageOptions,
  firstCreateStageId,
  itemsByColumn,
  customFields,
  fieldLabels,
  cardVisibility,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState(firstCreateStageId);

  useEffect(() => {
    setDefaultStage(firstCreateStageId);
  }, [firstCreateStageId]);

  function openCreate(columnId: string) {
    setDefaultStage(columnId);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Negócios"
        viewLabel="Kanban"
        createSlot={
          <>
            <Button
              type="button"
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => openCreate(firstCreateStageId)}
            >
              <Plus className="mr-2 size-4" />
              Criar
            </Button>
            <CreateDealDialog
              stageOptions={createStageOptions}
              customFields={customFields}
              fieldLabels={fieldLabels}
              open={createOpen}
              onOpenChange={setCreateOpen}
              defaultStage={defaultStage}
              showTrigger={false}
            />
          </>
        }
        toolbar={
          <PageToolbar
            variant="kanban"
            kanbanExtra={
              <KanbanCustomizeControl
                board="deals"
                initialColumns={kanbanEditableColumns}
                cardVisibility={cardVisibility}
                fieldLabels={{
                  title: fieldLabels.title ?? "Título",
                  value: fieldLabels.value ?? "Valor",
                  organization_name:
                    fieldLabels.organization_name ?? "Organização",
                  email: fieldLabels.email ?? "E-mail",
                  phone: fieldLabels.phone ?? "Telefone",
                  assignee_name:
                    fieldLabels.assignee_name ?? "Responsável",
                }}
              />
            }
          />
        }
      />
      <KanbanBoard
        variant="deal"
        columns={kanbanColumns}
        itemsByColumn={itemsByColumn}
        customFields={customFields}
        cardVisibility={cardVisibility}
        onAddClick={openCreate}
      />
    </div>
  );
}
