"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign, FileText, ListChecks } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  checklistProgress,
  labelChipClass,
  type CardEnrichment,
} from "@/lib/card-enrichment";

type Variant = "lead" | "deal" | "task";

export function KanbanCardWidgets({
  variant,
  cardId,
  enrichment,
}: {
  variant: Variant;
  cardId: string;
  enrichment: CardEnrichment | null | undefined;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const e = enrichment ?? null;
  const { done, total } = checklistProgress(e ?? undefined);
  const firstCl = e?.checklists?.[0];
  const previewItems = firstCl?.items?.slice(0, 4) ?? [];

  async function toggleItem(checklistId: string, itemId: string) {
    setPending(true);
    const res = await fetch("/api/kanban/card-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_checklist_item",
        variant,
        id: cardId,
        checklistId,
        itemId,
      }),
    });
    setPending(false);
    if (!res.ok) return;
    router.refresh();
  }

  return (
    <div
      className="mt-2 space-y-2 border-t border-border/60 pt-2"
      onClick={(ev) => ev.stopPropagation()}
    >
      {e?.labels && e.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {e.labels.slice(0, 4).map((l) => (
            <span
              key={l.id}
              className={cn(
                "inline-flex max-w-[140px] truncate rounded-full border px-2 py-0.5 text-[10px] font-medium",
                labelChipClass(l.color)
              )}
              title={l.name}
            >
              {l.name}
            </span>
          ))}
          {e.labels.length > 4 ? (
            <span className="text-[10px] text-muted-foreground">
              +{e.labels.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}

      {e?.team_members && e.team_members.length > 0 ? (
        <div className="flex items-center gap-1">
          <AtSign className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex -space-x-1.5">
            {e.team_members.slice(0, 5).map((m) => (
              <Avatar
                key={m.id}
                className="size-6 border-2 border-white ring-1 ring-border"
                title={m.name}
              >
                <AvatarFallback className="text-[9px]">
                  {m.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      ) : null}

      {e?.documents && e.documents.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileText className="size-3.5 shrink-0" />
            <span>{e.documents.length} documento(s)</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {e.documents.slice(0, 3).map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[11px] text-primary underline-offset-2 hover:underline"
                onClick={(ev) => ev.stopPropagation()}
              >
                {d.title || d.url}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {firstCl && previewItems.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ListChecks className="size-3.5 shrink-0" />
            <span>
              {firstCl.title}
              {total > 0 ? (
                <span className="text-foreground">
                  {" "}
                  ({done}/{total})
                </span>
              ) : null}
            </span>
          </div>
          <ul className="space-y-1">
            {previewItems.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <Checkbox
                  checked={it.done}
                  disabled={pending}
                  className="mt-0.5"
                  onCheckedChange={() => {
                    void toggleItem(firstCl.id, it.id);
                  }}
                />
                <span
                  className={cn(
                    "text-[11px] leading-snug",
                    it.done && "text-muted-foreground line-through"
                  )}
                >
                  {it.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : total > 0 ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ListChecks className="size-3.5" />
          <span>
            Checklist {done}/{total}
          </span>
        </div>
      ) : null}
    </div>
  );
}
