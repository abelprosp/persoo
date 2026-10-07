"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomFieldsInline } from "@/components/crm/custom-fields-inline";
import { KanbanCardDetailsDialog } from "@/components/crm/kanban-card-details-dialog";
import { KanbanCardWidgets } from "@/components/crm/kanban-card-widgets";
import type { CardEnrichment } from "@/lib/card-enrichment";
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
import { Pencil } from "lucide-react";
import {
  CustomDataEditor,
  customValuesFromRow,
} from "@/components/crm/custom-data-editor";
import { RecordActiveButton } from "@/components/crm/record-active-button";

export type DealRow = {
  id: string;
  title: string;
  value: number | null;
  outcome?: "open" | "won" | "lost";
  probability?: number;
  expected_close_at?: string | null;
  email: string | null;
  phone: string | null;
  assignee_name: string | null;
  organization_name: string | null;
  last_updated: string | null;
  custom_data?: unknown;
  active?: boolean;
  card_enrichment?: CardEnrichment | null;
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
  const [outcome,setOutcome]=useState(item.outcome ?? "open");
  const [probability,setProbability]=useState(String((item.probability ?? 0.5)*100));
  const [expectedClose,setExpectedClose]=useState(item.expected_close_at?.slice(0,10) ?? "");
  const [error,setError]=useState("");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [organizationName, setOrganizationName] = useState(
    item.organization_name ?? ""
  );
  const [value, setValue] = useState(item.value != null ? String(item.value) : "");
  const [email, setEmail] = useState(item.email ?? "");
  const [phone, setPhone] = useState(item.phone ?? "");
  const [assigneeName, setAssigneeName] = useState(item.assignee_name ?? "");
  const [customValues, setCustomValues] = useState(() =>
    customValuesFromRow(item, customFields)
  );

  async function onSave() {
    setError(""); setPending(true); try {
    const res = await fetch("/api/kanban/update-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant: "deal",
        id: item.id,
        payload: {
          title, outcome, probability:Number(probability)/100, expected_close_at:expectedClose,
          organization_name: organizationName,
          value,
          email,
          phone,
          assignee_name: assigneeName,
          custom_data: customValues,
        },
      }),
    });
    setPending(false);
    if (!res.ok) {const data=await res.json();setError(data.error || "Não foi possível salvar.");return;}
    setOpen(false);
    router.refresh(); } catch {setError("Falha de conexão.");} finally {setPending(false);}
  }

  const showCustom = visibility.custom && customFields.length > 0;
  return (
    <div
      className="cursor-pointer rounded-lg border border-border/80 bg-white p-3 shadow-sm"
      tabIndex={0} aria-label="Abrir detalhes do negócio"
      onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==="Enter" || e.key===" ")){e.preventDefault();setOpenDetails(true);}}}
      onClick={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        if (open || openDetails) return;
        setOpenDetails(true);
      }}
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
        <p className="mt-1 text-[11px] text-muted-foreground" suppressHydrationWarning>
          {relativeTime(item.last_updated)}
        </p>
      ) : null}
      <KanbanCardWidgets
        variant="deal"
        cardId={item.id}
        enrichment={item.card_enrichment}
      />
      <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
        <RecordActiveButton
          entity="deals"
          id={item.id}
          active={item.active}
          stopPropagation
        />
        <Button
          variant="ghost"
          size="icon" aria-label="Editar negócio"
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título" placeholder="Título" />
            <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} aria-label="Organização" placeholder="Organização" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Valor" placeholder="Valor" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" placeholder="E-mail" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Telefone" placeholder="Telefone" />
            <Input value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} aria-label="Responsável" placeholder="Responsável" />
            <label className="text-sm">Resultado<select className="block w-full rounded border p-2" value={outcome} onChange={e=>setOutcome(e.target.value as "open"|"won"|"lost")}><option value="open">Aberto</option><option value="won">Ganho</option><option value="lost">Perdido</option></select></label><label className="text-sm">Probabilidade (%)<Input type="number" min="0" max="100" value={probability} onChange={e=>setProbability(e.target.value)}/></label><label className="text-sm">Fechamento previsto<Input type="date" value={expectedClose} onChange={e=>setExpectedClose(e.target.value)}/></label><CustomDataEditor
              fields={customFields}
              values={customValues}
              onChange={(key, value) =>
                setCustomValues((prev) => ({ ...prev, [key]: value }))
              }
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter>
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
