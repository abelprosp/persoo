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
import { formatBRL, relativeTime } from "@/lib/format";
import type { CustomFieldDef } from "@/lib/ai-schema";
import type { DealKanbanCardVisibility } from "@/lib/kanban-schema";
import { FileText, ListChecks, MessageSquare, Pencil } from "lucide-react";

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
  const router = useRouter();
  const [openDetails, setOpenDetails] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [organizationName, setOrganizationName] = useState(
    item.organization_name ?? ""
  );
  const [value, setValue] = useState(item.value != null ? String(item.value) : "");
  const [email, setEmail] = useState(item.email ?? "");
  const [phone, setPhone] = useState(item.phone ?? "");
  const [assigneeName, setAssigneeName] = useState(item.assignee_name ?? "");

  async function onSave() {
    setPending(true);
    const res = await fetch("/api/kanban/update-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant: "deal",
        id: item.id,
        payload: {
          title,
          organization_name: organizationName,
          value,
          email,
          phone,
          assignee_name: assigneeName,
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
      onClick={() => setOpenDetails(true)}
    >
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar negócio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
            <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Organização" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
            <Input value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} placeholder="Responsável" />
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
        variant="deal"
        cardId={item.id}
        title={item.title}
        open={openDetails}
        onOpenChange={setOpenDetails}
      />
    </div>
  );
}
