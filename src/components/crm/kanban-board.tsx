"use client";

import { useEffect, useState, type DragEvent } from "react";
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
  /** Persistência ao mover card entre colunas */
  onMoveCard?: (
    itemId: string,
    fromColumnId: string,
    toColumnId: string
  ) => Promise<boolean>;
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
  const [localByColumn, setLocalByColumn] = useState(itemsByColumn);

  useEffect(() => {
    setLocalByColumn(itemsByColumn);
  }, [itemsByColumn]);

  function parseDrag(data: string): { id: string; from: string } | null {
    try {
      const v = JSON.parse(data) as { id?: string; from?: string };
      if (typeof v.id === "string" && typeof v.from === "string") {
        return { id: v.id, from: v.from };
      }
    } catch {
      /* noop */
    }
    return null;
  }

  async function handleDrop(
    toColumnId: string,
    e: DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-persoo-kanban");
    const parsed = parseDrag(raw);
    if (!parsed) return;
    const { id, from } = parsed;
    if (!id || !from || from === toColumnId) return;

    let moved: Record<string, unknown> | null = null;
    const previous = localByColumn;
    const next = { ...previous };
    next[from] = [...(next[from] ?? [])].filter((r) => {
      const match = String((r as { id?: string }).id ?? "") === id;
      if (match) moved = r;
      return !match;
    });
    if (!moved) return;
    next[toColumnId] = [moved, ...(next[toColumnId] ?? [])];
    setLocalByColumn(next);

    if (props.onMoveCard) {
      const ok = await props.onMoveCard(id, from, toColumnId);
      if (!ok) setLocalByColumn(previous);
    }
  }

  return (
    <ScrollArea className="w-full pb-4">
      <div className="flex min-h-[420px] gap-4 pr-4">
        {columns.map((col) => {
          const items = localByColumn[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="flex w-[300px] shrink-0 flex-col rounded-3xl border border-white/60 bg-white/55 shadow-lg shadow-slate-900/[0.04] ring-1 ring-white/80 backdrop-blur-xl"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => void handleDrop(col.id, e)}
            >
              <div className="flex items-center justify-between border-b border-zinc-200/50 px-3 py-2.5">
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
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "application/x-persoo-kanban",
                          JSON.stringify({ id: row.id, from: col.id })
                        )
                      }
                    >
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
