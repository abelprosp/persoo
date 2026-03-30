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
import { createLead } from "@/app/app/leads/actions";
import { cn } from "@/lib/utils";
import type { CustomFieldDef } from "@/lib/ai-schema";

export type StatusOption = { id: string; label: string };

export type LeadFormFieldLabels = {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  owner_name?: string;
  status?: string;
};

type Props = {
  statusOptions: StatusOption[];
  customFields: CustomFieldDef[];
  fieldLabels?: LeadFormFieldLabels;
  dialogTitle?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStatus?: string;
  showTrigger?: boolean;
};

export function CreateLeadDialog({
  statusOptions,
  customFields,
  fieldLabels,
  dialogTitle = "Novo lead",
  open: controlledOpen,
  onOpenChange,
  defaultStatus = "new",
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
  const [status, setStatus] = useState(defaultStatus);

  const lb = {
    full_name: fieldLabels?.full_name ?? "Nome",
    email: fieldLabels?.email ?? "E-mail",
    phone: fieldLabels?.phone ?? "Telefone",
    company: fieldLabels?.company ?? "Empresa",
    owner_name: fieldLabels?.owner_name ?? "Responsável",
    status: fieldLabels?.status ?? "Coluna inicial",
  };

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
      setError(null);
    }
  }, [open, defaultStatus]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createLead(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    setStatus(defaultStatus);
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
            <div className="grid max-h-[min(70vh,520px)] gap-3 overflow-y-auto py-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="lead-name">{lb.full_name} *</Label>
                <Input
                  id="lead-name"
                  name="full_name"
                  required
                  autoComplete="name"
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-email">{lb.email}</Label>
                <Input
                  id="lead-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone">{lb.phone}</Label>
                <Input
                  id="lead-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-company">{lb.company}</Label>
                <Input id="lead-company" name="company" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-owner">{lb.owner_name}</Label>
                <Input
                  id="lead-owner"
                  name="owner_name"
                  placeholder="Nome do comercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-status">{lb.status}</Label>
                <select
                  id="lead-status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  {statusOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`lead-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`lead-cf-${f.key}`}
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
                {pending ? "A guardar…" : "Criar lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
