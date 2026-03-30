"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Columns3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { saveKanbanCustomize } from "@/app/app/kanban/actions";
import {
  DEAL_KANBAN_CARD_FIELD_KEYS,
  LEAD_KANBAN_CARD_FIELD_KEYS,
  slugifyKanbanId,
  type DealKanbanCardFieldKey,
  type DealKanbanCardVisibility,
  type LeadKanbanCardFieldKey,
  type LeadKanbanCardVisibility,
} from "@/lib/kanban-schema";

type LeadLabels = {
  company: string;
  email: string;
  phone: string;
  owner_name: string;
};

type DealLabels = {
  title: string;
  value: string;
  organization_name: string;
  email: string;
  phone: string;
  assignee_name: string;
};

export type KanbanCustomizeLeadProps = {
  board: "leads";
  initialColumns: { id: string; title: string }[];
  cardVisibility: LeadKanbanCardVisibility;
  fieldLabels: LeadLabels;
};

export type KanbanCustomizeDealProps = {
  board: "deals";
  initialColumns: { id: string; title: string }[];
  cardVisibility: DealKanbanCardVisibility;
  fieldLabels: DealLabels;
};

export type KanbanCustomizeProps =
  | KanbanCustomizeLeadProps
  | KanbanCustomizeDealProps;

type DialogProps = KanbanCustomizeProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function leadCheckboxLabel(
  key: LeadKanbanCardFieldKey,
  fieldLabels: LeadLabels
): string {
  switch (key) {
    case "company":
      return fieldLabels.company;
    case "email":
      return fieldLabels.email;
    case "phone":
      return fieldLabels.phone;
    case "owner":
      return fieldLabels.owner_name;
    case "last_activity":
      return "Última atividade";
    case "custom":
      return "Campos personalizados";
    default:
      return key;
  }
}

function dealCheckboxLabel(
  key: DealKanbanCardFieldKey,
  fieldLabels: DealLabels
): string {
  switch (key) {
    case "org_or_title":
      return `${fieldLabels.organization_name} / ${fieldLabels.title}`;
    case "value":
      return fieldLabels.value;
    case "email":
      return fieldLabels.email;
    case "phone":
      return fieldLabels.phone;
    case "assignee":
      return fieldLabels.assignee_name;
    case "last_updated":
      return "Última atualização";
    case "custom":
      return "Campos personalizados";
    default:
      return key;
  }
}

export function KanbanCustomizeDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<{ id: string; title: string }[]>([]);
  const [newColTitle, setNewColTitle] = useState("");
  const [leadFields, setLeadFields] = useState<LeadKanbanCardVisibility | null>(
    null
  );
  const [dealFields, setDealFields] = useState<DealKanbanCardVisibility | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (!open) return;
    const p = propsRef.current;
    setColumns(p.initialColumns.map((c) => ({ ...c })));
    setNewColTitle("");
    setError(null);
    if (p.board === "leads") {
      setLeadFields({ ...p.cardVisibility });
      setDealFields(null);
    } else {
      setDealFields({ ...p.cardVisibility });
      setLeadFields(null);
    }
  }, [open]);

  function moveColumn(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= columns.length) return;
    setColumns((prev) => {
      const next = [...prev];
      const t = next[index]!;
      next[index] = next[j]!;
      next[j] = t;
      return next;
    });
  }

  function removeColumn(index: number) {
    if (columns.length <= 2) return;
    setColumns((prev) => prev.filter((_, i) => i !== index));
  }

  function addColumn() {
    const title = newColTitle.trim();
    if (!title) return;
    const base = slugifyKanbanId(title) || `col_${Date.now()}`;
    const ids = new Set(columns.map((c) => c.id));
    let id = base;
    let n = 0;
    while (ids.has(id)) {
      n += 1;
      id = `${base}_${n}`;
    }
    setColumns((prev) => [...prev, { id, title: title.slice(0, 80) }]);
    setNewColTitle("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const cardFields =
      props.board === "leads"
        ? { ...(leadFields ?? props.cardVisibility) }
        : { ...(dealFields ?? props.cardVisibility) };
    const r = await saveKanbanCustomize({
      board: props.board,
      columns,
      cardFields,
    });
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  const title =
    props.board === "leads"
      ? "Colunas e campos — Leads"
      : "Colunas e campos — Negócios";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            As colunas definem o fluxo (gravado em{" "}
            <code className="rounded bg-muted px-1 text-xs">status</code> ou{" "}
            <code className="rounded bg-muted px-1 text-xs">stage</code>).
            Alterar o identificador interno de uma coluna existente não é
            suportado aqui — renomeie só o título visível.
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-3 py-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Colunas (ordem do fluxo)
            </Label>
            <div className="space-y-2">
              {columns.map((col, index) => (
                <div
                  key={col.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/15 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      value={col.title}
                      onChange={(e) =>
                        setColumns((prev) =>
                          prev.map((c, i) =>
                            i === index
                              ? { ...c, title: e.target.value }
                              : c
                          )
                        )
                      }
                      placeholder="Título da coluna"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      id: <code className="rounded bg-muted/80 px-1">{col.id}</code>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={index === 0}
                      onClick={() => moveColumn(index, -1)}
                      title="Subir"
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={index === columns.length - 1}
                      onClick={() => moveColumn(index, 1)}
                      title="Descer"
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={columns.length <= 2}
                      title="Remover coluna"
                      onClick={() => removeColumn(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="new-kanban-col" className="text-xs">
                  Nova coluna
                </Label>
                <Input
                  id="new-kanban-col"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  placeholder="Ex.: Proposta enviada"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={addColumn}
              >
                <Plus className="mr-1 size-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3 py-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Campos no cartão
            </Label>
            <div className="grid gap-2">
              {props.board === "leads" && leadFields
                ? LEAD_KANBAN_CARD_FIELD_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={leadFields[key]}
                        onCheckedChange={(c) =>
                          setLeadFields((prev) =>
                            prev
                              ? { ...prev, [key]: c === true }
                              : prev
                          )
                        }
                      />
                      {leadCheckboxLabel(key, props.fieldLabels)}
                    </label>
                  ))
                : null}
              {props.board === "deals" && dealFields
                ? DEAL_KANBAN_CARD_FIELD_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={dealFields[key]}
                        onCheckedChange={(c) =>
                          setDealFields((prev) =>
                            prev
                              ? { ...prev, [key]: c === true }
                              : prev
                          )
                        }
                      />
                      {dealCheckboxLabel(key, props.fieldLabels)}
                    </label>
                  ))
                : null}
            </div>
            <p className="text-xs text-muted-foreground">
              O nome do lead ou o bloco principal do negócio mantém-se sempre
              visível no topo do cartão.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KanbanCustomizeControl(props: KanbanCustomizeProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Columns3 className="mr-2 size-4" />
        Colunas e campos
      </Button>
      <KanbanCustomizeDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
