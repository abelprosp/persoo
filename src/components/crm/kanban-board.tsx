"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type {
  DealKanbanCardVisibility,
  LeadKanbanCardVisibility,
  TaskKanbanCardVisibility,
} from "@/lib/kanban-schema";
import {
  LeadKanbanCard,
  type LeadRow,
} from "@/components/crm/lead-kanban-card";
import {
  DealKanbanCard,
  type DealRow,
} from "@/components/crm/deal-kanban-card";
import {
  TaskKanbanCard,
  type TaskRow,
} from "@/components/crm/task-kanban-card";

export type KanbanColumnDef = {
  id: string;
  title: string;
  dotClass: string;
};

type BaseProps = {
  columns: KanbanColumnDef[];
  itemsByColumn: Record<string, Record<string, unknown>[]>;
  /** "+" na coluna abre criação com esta coluna pré-selecionada */
  onAddClick?: (columnId: string) => void;
};

type LeadProps = BaseProps & {
  variant: "lead";
  customFields: CustomFieldDef[];
  cardVisibility: LeadKanbanCardVisibility;
};

type DealProps = BaseProps & {
  variant: "deal";
  customFields: CustomFieldDef[];
  cardVisibility: DealKanbanCardVisibility;
};

type TaskProps = BaseProps & {
  variant: "task";
  customFields: CustomFieldDef[];
  cardVisibility: TaskKanbanCardVisibility;
};

type Props = LeadProps | DealProps | TaskProps;

export function KanbanBoard(props: Props) {
  const { columns, itemsByColumn, onAddClick, variant } = props;
  const customFields = props.customFields;

  return (
    <ScrollArea className="w-full pb-4">
      <div className="flex min-h-[420px] gap-4 pr-4">
        {columns.map((col) => {
          const items = itemsByColumn[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/80 bg-white/90 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white",
                      col.dotClass
                    )}
                  />
                  <span className="text-sm font-semibold">{col.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  type="button"
                  title="Novo nesta coluna"
                  onClick={() => onAddClick?.(col.id)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {items.map((raw) => {
                  const row = raw as { id: string } & Record<string, unknown>;
                  return (
                    <div key={row.id}>
                      {variant === "lead" ? (
                        <LeadKanbanCard
                          item={row as LeadRow}
                          customFields={customFields}
                          visibility={props.cardVisibility}
                        />
                      ) : variant === "deal" ? (
                        <DealKanbanCard
                          item={row as DealRow}
                          customFields={customFields}
                          visibility={props.cardVisibility}
                        />
                      ) : (
                        <TaskKanbanCard
                          item={row as TaskRow}
                          customFields={customFields}
                          visibility={props.cardVisibility}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
