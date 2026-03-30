"use client";

import { CustomFieldsInline } from "@/components/crm/custom-fields-inline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";
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
  const showCustom = visibility.custom && customFields.length > 0;
  return (
    <div className="rounded-lg border border-border/80 bg-white p-3 shadow-sm">
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
    </div>
  );
}
