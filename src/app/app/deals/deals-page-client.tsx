"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";
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
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState(firstCreateStageId);

  useEffect(() => {
    setDefaultStage(firstCreateStageId);
  }, [firstCreateStageId]);

  function openCreate(columnId: string) {
    setDefaultStage(columnId);
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
        variant: "deal",
        id: itemId,
        fromColumn,
        toColumn,
      }),
    });
    if (!res.ok) return false;
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Negócios"
        viewLabel="Kanban"
        createSlot={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => openCreate(firstCreateStageId)}
            >
              <Plus className="mr-2 size-4" />
              Criar
            </Button>
            <AiModuleCustomizeButton module="deals" title="Negócios" />
            <CreateDealDialog
              stageOptions={createStageOptions}
              customFields={customFields}
              fieldLabels={fieldLabels}
              open={createOpen}
              onOpenChange={setCreateOpen}
              defaultStage={defaultStage}
              showTrigger={false}
            />
          </div>
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
        onMoveCard={moveCard}
      />
    </div>
  );
}
