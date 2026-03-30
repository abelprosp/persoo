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
import { createOrganization } from "@/app/app/organizations/actions";

export type OrgFormFieldLabels = {
  name?: string;
  website?: string;
  industry?: string;
  annual_revenue?: string;
  logo_url?: string;
};

type Props = {
  customFields: CustomFieldDef[];
  fieldLabels?: OrgFormFieldLabels;
  dialogTitle?: string;
};

export function CreateOrganizationDialog({
  customFields,
  fieldLabels,
  dialogTitle = "Nova organização",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createOrganization(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  const lb = {
    name: fieldLabels?.name ?? "Nome",
    website: fieldLabels?.website ?? "Website",
    industry: fieldLabels?.industry ?? "Setor",
    annual_revenue: fieldLabels?.annual_revenue ?? "Receita anual (R$)",
    logo_url: fieldLabels?.logo_url ?? "URL do logótipo",
  };

  return (
    <>
      <Button
        type="button"
        className="bg-zinc-900 text-white hover:bg-zinc-800"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 size-4" />
        Criar
      </Button>
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
                <Label htmlFor="org-name">{lb.name} *</Label>
                <Input
                  id="org-name"
                  name="name"
                  required
                  autoComplete="organization"
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-website">{lb.website}</Label>
                <Input
                  id="org-website"
                  name="website"
                  type="text"
                  placeholder="exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-industry">{lb.industry}</Label>
                <Input
                  id="org-industry"
                  name="industry"
                  placeholder="Ex.: Tecnologia, Saúde"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-revenue">{lb.annual_revenue}</Label>
                <Input
                  id="org-revenue"
                  name="annual_revenue"
                  type="text"
                  inputMode="decimal"
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-logo">{lb.logo_url}</Label>
                <Input
                  id="org-logo"
                  name="logo_url"
                  type="url"
                  placeholder="https://…"
                />
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`org-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`org-cf-${f.key}`}
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
                {pending ? "A guardar…" : "Criar organização"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
