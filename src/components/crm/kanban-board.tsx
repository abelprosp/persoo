"use client";

import { useEffect, useState, type DragEvent } from "react";
import { formatBRL } from "@/lib/format";
import { Input } from "@/components/ui/input";
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
  const [query,setQuery] = useState("");
  const [list,setList] = useState(false);
  const [error,setError] = useState("");
  const [moving,setMoving] = useState(false);
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
    if (moving || !id || !from || from === toColumnId) return;

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
      setMoving(true); setError("");
      try { const ok = await props.onMoveCard(id, from, toColumnId); if (!ok) { setLocalByColumn(previous); setError("Não foi possível mover. Atualize a página e tente novamente."); } }
      catch { setLocalByColumn(previous); setError("Falha de conexão. A movimentação foi desfeita."); }
      finally { setMoving(false); }
    }
  }

  return (
    <div className="space-y-3"><div className="flex flex-wrap gap-2"><Input aria-label="Buscar nos cartões carregados" placeholder="Buscar nos cartões…" value={query} onChange={e=>setQuery(e.target.value)} className="max-w-sm"/><Button variant="outline" aria-pressed={!list} onClick={()=>setList(false)}>Quadro</Button><Button variant="outline" aria-pressed={list} onClick={()=>setList(true)}>Lista</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<ScrollArea className="w-full pb-4">
      <div className={list ? "flex flex-col gap-4" : "flex min-h-[420px] gap-4 pr-4"}>
        {columns.map((col) => {
          const items = (localByColumn[col.id] ?? []).filter(item => Object.values(item).some(value => typeof value === "string" && value.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
          return (
            <div
              key={col.id}
              className={cn("flex shrink-0 flex-col rounded-xl border border-border/80 bg-white/90 shadow-sm", list ? "w-full" : "w-[300px]")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => void handleDrop(col.id, e)}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white",
                      col.dotClass
                    )}
                  />
                  <span className="text-sm font-semibold">{col.title} <span className="text-muted-foreground">({items.length})</span>{variant === "deal" && <span className="block text-xs text-muted-foreground">{formatBRL(items.reduce((sum,item)=>sum+Number(item.value ?? 0),0))}</span>}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  type="button"
                  title="Novo nesta coluna"
                  aria-label={`Criar em ${col.title}`}
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
                      draggable={!moving}
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "application/x-persoo-kanban",
                          JSON.stringify({ id: row.id, from: col.id })
                        )
                      }
                    >
                      {props.onMoveCard && <select aria-label={`Mover ${String(row.title ?? row.full_name ?? "cartão")}`} className="mb-1 w-full rounded border bg-background p-1 text-xs" value={col.id} disabled={moving} onChange={e => {const target=e.target.value; void handleDrop(target, {preventDefault(){},dataTransfer:{getData(){return JSON.stringify({id:row.id,from:col.id});}}} as unknown as DragEvent<HTMLDivElement>);}}>{columns.map(column=><option key={column.id} value={column.id}>{column.title}</option>)}</select>}
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
    </ScrollArea></div>
  );
}
