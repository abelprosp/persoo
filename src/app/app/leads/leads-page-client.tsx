"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateLeadDialog,
  type LeadFormFieldLabels,
  type StatusOption,
} from "@/components/crm/create-lead-dialog";
import { PageHeader } from "@/components/crm/page-header";
import { PageToolbar } from "@/components/crm/page-toolbar";
import {
  KanbanBoard,
  type KanbanColumnDef,
} from "@/components/crm/kanban-board";
import { KanbanCustomizeControl } from "@/components/crm/kanban-customize-dialog";
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { LeadKanbanCardVisibility } from "@/lib/kanban-schema";

type Props = {
  kanbanColumns: KanbanColumnDef[];
  kanbanEditableColumns: { id: string; title: string }[];
  createStatusOptions: StatusOption[];
  firstCreateStatusId: string;
  itemsByColumn: Record<string, Record<string, unknown>[]>;
  customFields: CustomFieldDef[];
  fieldLabels: LeadFormFieldLabels;
  cardVisibility: LeadKanbanCardVisibility;
};

export function LeadsPageClient({
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

  useEffect(() => {
    setDefaultStatus(firstCreateStatusId);
  }, [firstCreateStatusId]);

  function openCreate(columnId: string) {
    setDefaultStatus(columnId);
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
        variant: "lead",
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
        breadcrumb="Leads"
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
            <AiModuleCustomizeButton module="leads" title="Leads" />
            <CreateLeadDialog
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
                board="leads"
                initialColumns={kanbanEditableColumns}
                cardVisibility={cardVisibility}
                fieldLabels={{
                  company: fieldLabels.company ?? "Empresa",
                  email: fieldLabels.email ?? "E-mail",
                  phone: fieldLabels.phone ?? "Telefone",
                  owner_name: fieldLabels.owner_name ?? "Responsável",
                }}
              />
            }
          />
        }
      />
      <KanbanBoard
        variant="lead"
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
