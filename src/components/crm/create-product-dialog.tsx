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
import { Textarea } from "@/components/ui/textarea";
import { createProduct } from "@/app/app/products/actions";
import type { CustomFieldDef } from "@/lib/ai-schema";

export type ProductFormFieldLabels = {
  name?: string;
  sku?: string;
  description?: string;
  unit_price?: string;
};

type Props = {
  customFields: CustomFieldDef[];
  fieldLabels?: ProductFormFieldLabels;
  dialogTitle?: string;
};

export function CreateProductDialog({
  customFields,
  fieldLabels,
  dialogTitle = "Novo produto",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const lb = {
    name: fieldLabels?.name ?? "Nome",
    sku: fieldLabels?.sku ?? "SKU / código",
    description: fieldLabels?.description ?? "Descrição",
    unit_price: fieldLabels?.unit_price ?? "Preço unitário (R$)",
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createProduct(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

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
                <Label htmlFor="prod-name">{lb.name} *</Label>
                <Input id="prod-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-sku">{lb.sku}</Label>
                <Input id="prod-sku" name="sku" placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-desc">{lb.description}</Label>
                <Textarea
                  id="prod-desc"
                  name="description"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-price">{lb.unit_price}</Label>
                <Input
                  id="prod-price"
                  name="unit_price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  defaultValue="0"
                />
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`prod-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`prod-cf-${f.key}`}
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
                {pending ? "A guardar…" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
