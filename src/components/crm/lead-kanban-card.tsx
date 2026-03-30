"use client";

import { CustomFieldsInline } from "@/components/crm/custom-fields-inline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { LeadKanbanCardVisibility } from "@/lib/kanban-schema";
import {
  AtSign,
  FileText,
  ListChecks,
  MessageSquare,
  Plus,
} from "lucide-react";

export type LeadRow = {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  owner_name: string | null;
  last_activity_at: string | null;
  custom_data?: unknown;
};

export function LeadKanbanCard({
  item,
  customFields,
  visibility,
}: {
  item: LeadRow;
  customFields: CustomFieldDef[];
  visibility: LeadKanbanCardVisibility;
}) {
  const initial = item.full_name?.charAt(0) ?? "?";
  const showCustom = visibility.custom && customFields.length > 0;
  return (
    <div className="rounded-lg border border-border/80 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.full_name}</p>
          {visibility.company ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.company ?? "—"}
            </p>
          ) : null}
          {visibility.email ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.email ?? "—"}
            </p>
          ) : null}
          {visibility.phone ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.phone ?? "—"}
            </p>
          ) : null}
        </div>
      </div>
      {showCustom ? (
        <CustomFieldsInline
          fields={customFields}
          row={{ custom_data: item.custom_data }}
        />
      ) : null}
      {visibility.owner ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-5">
            <AvatarFallback className="text-[8px]">S</AvatarFallback>
          </Avatar>
          <span>{item.owner_name ?? "—"}</span>
        </div>
      ) : null}
      {visibility.last_activity ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {relativeTime(item.last_activity_at)}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
        <div className="flex gap-2 text-muted-foreground">
          <AtSign className="size-3.5" />
          <FileText className="size-3.5" />
          <ListChecks className="size-3.5" />
          <MessageSquare className="size-3.5" />
        </div>
        <Button variant="ghost" size="icon" className="size-7" type="button">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
