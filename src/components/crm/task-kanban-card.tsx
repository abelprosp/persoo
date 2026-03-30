"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomFieldsInline } from "@/components/crm/custom-fields-inline";
import { KanbanCardDetailsDialog } from "@/components/crm/kanban-card-details-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Pencil } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { TaskKanbanCardVisibility } from "@/lib/kanban-schema";
import { cn } from "@/lib/utils";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high" | string | null;
  due_at: string | null;
  assignee_name: string | null;
  updated_at: string | null;
  custom_data?: unknown;
};

function priorityLabel(p: TaskRow["priority"]) {
  if (p === "high") return "Alta";
  if (p === "low") return "Baixa";
  return "Média";
}

export function TaskKanbanCard({
  item,
  customFields,
  visibility,
}: {
  item: TaskRow;
  customFields: CustomFieldDef[];
  visibility: TaskKanbanCardVisibility;
}) {
  const router = useRouter();
  const [openDetails, setOpenDetails] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [priority, setPriority] = useState(item.priority ?? "medium");
  const [assigneeName, setAssigneeName] = useState(item.assignee_name ?? "");
  const [dueAt, setDueAt] = useState(
    item.due_at ? new Date(item.due_at).toISOString().slice(0, 16) : ""
  );

  async function onSave() {
    setPending(true);
    const res = await fetch("/api/kanban/update-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant: "task",
        id: item.id,
        payload: {
          title,
          priority,
          assignee_name: assigneeName,
          due_at: dueAt,
        },
      }),
    });
    setPending(false);
    if (!res.ok) return;
    setOpen(false);
    router.refresh();
  }

  const showCustom = visibility.custom && customFields.length > 0;
  return (
    <div
      className="cursor-pointer rounded-lg border border-border/80 bg-white p-3 shadow-sm"
      onClick={() => {
        if (open || openDetails) return;
        setOpenDetails(true);
      }}
    >
      <div className="mb-1 flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <p className="truncate text-sm font-semibold">{item.title}</p>

      {visibility.status ? (
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {item.status?.replace("_", " ") ?? "—"}
        </p>
      ) : null}

      {visibility.priority ? (
        <p className="mt-1 text-xs">
          <span
            className={cn(
              "font-medium",
              item.priority === "high" && "text-orange-700"
            )}
          >
            {priorityLabel(item.priority)}
          </span>
        </p>
      ) : null}

      {visibility.due_at ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {item.due_at ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {new Date(item.due_at).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            "Sem prazo"
          )}
        </p>
      ) : null}

      {showCustom ? (
        <CustomFieldsInline fields={customFields} row={{ custom_data: item.custom_data }} />
      ) : null}

      {visibility.assignee ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-5">
            <AvatarFallback className="text-[8px]">
              {item.assignee_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span>{item.assignee_name ?? "—"}</span>
        </div>
      ) : null}

      {visibility.updated_at ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {relativeTime(item.updated_at)}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
            <select
              value={priority ?? "medium"}
              onChange={(e) => setPriority(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <Input value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} placeholder="Atribuído" />
            <Input value={dueAt} onChange={(e) => setDueAt(e.target.value)} type="datetime-local" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={pending}>
              {pending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <KanbanCardDetailsDialog
        variant="task"
        cardId={item.id}
        title={item.title}
        open={openDetails}
        onOpenChange={setOpenDetails}
      />
    </div>
  );
}
