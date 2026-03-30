"use client";

import { useState } from "react";
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
import type { CustomFieldDef } from "@/lib/ai-schema";
import { readRowCustomData } from "@/lib/ai-schema";
import { createContact, updateContact } from "@/app/app/contacts/actions";

export type ContactFormFieldLabels = {
  email?: string;
  phone?: string;
  organization?: string;
};

export type ContactRow = {
  id: string;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  custom_data?: unknown;
};

type Props = {
  organizations: { id: string; name: string }[];
  customFields: CustomFieldDef[];
  fieldLabels?: ContactFormFieldLabels;
  /** Se definido, modo edição */
  contact?: ContactRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Mostrar botão Criar (lista); false quando só o diálogo é controlado externamente */
  showTrigger?: boolean;
  dialogTitle?: string;
};

export function ContactFormDialog({
  organizations,
  customFields,
  fieldLabels,
  contact,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
  dialogTitle,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEdit = Boolean(contact?.id);
  const title =
    dialogTitle ?? (isEdit ? "Editar contacto" : "Novo contacto");

  const lb = {
    email: fieldLabels?.email ?? "E-mail",
    phone: fieldLabels?.phone ?? "Telefone",
    organization: fieldLabels?.organization ?? "Organização",
  };

  function handleOpenChange(v: boolean) {
    if (!v) setError(null);
    setOpen(v);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = isEdit
      ? await updateContact(fd)
      : await createContact(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    handleOpenChange(false);
    if (!isEdit) e.currentTarget.reset();
    router.refresh();
  }

  const custom = contact ? readRowCustomData(contact) : {};

  return (
    <>
      {showTrigger && !isEdit ? (
        <Button
          type="button"
          className="bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Criar
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" key={contact?.id ?? "new"}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto py-4">
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              {isEdit ? (
                <input type="hidden" name="id" value={contact!.id} />
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="contact-email">{lb.email}</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@exemplo.com"
                  defaultValue={contact?.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">{lb.phone}</Label>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+351 …"
                  defaultValue={contact?.phone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-org">{lb.organization}</Label>
                <select
                  id="contact-org"
                  name="organization_id"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  defaultValue={contact?.organization_id ?? ""}
                >
                  <option value="">Sem organização</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`contact-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`contact-cf-${f.key}`}
                    name={`custom_${f.key}`}
                    defaultValue={
                      custom[f.key] != null ? String(custom[f.key]) : ""
                    }
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Preencha pelo menos e-mail ou telefone.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar…" : isEdit ? "Guardar" : "Criar contacto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
