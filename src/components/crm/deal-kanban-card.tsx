"use client";

import { CustomFieldsInline } from "@/components/crm/custom-fields-inline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatBRL, relativeTime } from "@/lib/format";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { DealKanbanCardVisibility } from "@/lib/kanban-schema";
import { FileText, ListChecks, MessageSquare, Plus } from "lucide-react";

export type DealRow = {
  id: string;
  title: string;
  value: number | null;
  email: string | null;
  phone: string | null;
  assignee_name: string | null;
  organization_name: string | null;
  last_updated: string | null;
  custom_data?: unknown;
};

export function DealKanbanCard({
  item,
  customFields,
  visibility,
}: {
  item: DealRow;
  customFields: CustomFieldDef[];
  visibility: DealKanbanCardVisibility;
}) {
  const showCustom = visibility.custom && customFields.length > 0;
  return (
    <div className="rounded-lg border border-border/80 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <Avatar className="size-9 rounded-md">
          <AvatarFallback className="rounded-md text-[10px]">
            {item.organization_name?.slice(0, 2).toUpperCase() ?? "—"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {visibility.org_or_title ? (
            <p className="truncate text-sm font-semibold">
              {item.organization_name ?? item.title}
            </p>
          ) : null}
          {visibility.value ? (
            <p className="text-base font-bold tabular-nums">
              {formatBRL(item.value)}
            </p>
          ) : null}
        </div>
      </div>
      {visibility.email ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.email ?? "—"}
        </p>
      ) : null}
      {visibility.phone ? (
        <p className="truncate text-xs text-muted-foreground">
          {item.phone ?? "—"}
        </p>
      ) : null}
      {showCustom ? (
        <CustomFieldsInline
          fields={customFields}
          row={{ custom_data: item.custom_data }}
        />
      ) : null}
      {visibility.assignee ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-5">
            <AvatarFallback className="text-[8px]">S</AvatarFallback>
          </Avatar>
          <span>{item.assignee_name ?? "—"}</span>
        </div>
      ) : null}
      {visibility.last_updated ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {relativeTime(item.last_updated)}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
        <div className="flex gap-3 text-muted-foreground">
          <ListChecks className="size-3.5" />
          <FileText className="size-3.5" />
          <span className="flex items-center gap-0.5 text-[11px]">
            <MessageSquare className="size-3.5" />0
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" type="button">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
