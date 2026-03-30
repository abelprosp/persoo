"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeal } from "@/app/app/deals/actions";
import { cn } from "@/lib/utils";
import type { CustomFieldDef } from "@/lib/ai-schema";

export type StageOption = { id: string; label: string };

export type DealFormFieldLabels = {
  title?: string;
  value?: string;
  stage?: string;
  organization_name?: string;
  email?: string;
  phone?: string;
  assignee_name?: string;
};

type Props = {
  stageOptions: StageOption[];
  customFields: CustomFieldDef[];
  fieldLabels?: DealFormFieldLabels;
  dialogTitle?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStage?: string;
  showTrigger?: boolean;
};

export function CreateDealDialog({
  stageOptions,
  customFields,
  fieldLabels,
  dialogTitle = "Novo negócio",
  open: controlledOpen,
  onOpenChange,
  defaultStage = "qualification",
  showTrigger = true,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? Boolean(controlledOpen) : internalOpen;
  function setOpen(next: boolean) {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState(defaultStage);

  const lb = {
    title: fieldLabels?.title ?? "Título",
    value: fieldLabels?.value ?? "Valor (R$)",
    stage: fieldLabels?.stage ?? "Etapa inicial",
    organization_name: fieldLabels?.organization_name ?? "Organização",
    email: fieldLabels?.email ?? "E-mail",
    phone: fieldLabels?.phone ?? "Telefone",
    assignee_name: fieldLabels?.assignee_name ?? "Responsável",
  };

  useEffect(() => {
    if (open) {
      setStage(defaultStage);
      setError(null);
    }
  }, [open, defaultStage]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createDeal(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    setStage(defaultStage);
    router.refresh();
  }

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          className="bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          Criar
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto py-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="deal-title">{lb.title} *</Label>
                <Input
                  id="deal-title"
                  name="title"
                  required
                  placeholder="Ex.: Licenciamento anual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-value">{lb.value}</Label>
                <Input
                  id="deal-value"
                  name="value"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  defaultValue="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-stage">{lb.stage}</Label>
                <select
                  id="deal-stage"
                  name="stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  {stageOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-org">{lb.organization_name}</Label>
                <Input
                  id="deal-org"
                  name="organization_name"
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-email">{lb.email}</Label>
                <Input
                  id="deal-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-phone">{lb.phone}</Label>
                <Input
                  id="deal-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-assignee">{lb.assignee_name}</Label>
                <Input
                  id="deal-assignee"
                  name="assignee_name"
                  placeholder="Nome do comercial"
                />
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`deal-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`deal-cf-${f.key}`}
                    name={`custom_${f.key}`}
                    type={
                      f.type.toLowerCase() === "number"
                        ? "text"
                        : f.type.toLowerCase() === "date"
                          ? "date"
                          : "text"
                    }
                    inputMode={
                      f.type.toLowerCase() === "number" ? "decimal" : undefined
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar…" : "Criar negócio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
