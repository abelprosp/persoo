"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomFieldDef } from "@/lib/ai-schema";
import { readRowCustomData } from "@/lib/ai-schema";
import { updateProduct } from "@/app/app/products/actions";
import { setRecordActive } from "@/app/app/records/actions";

export type ProductFormLabels = {
  name: string;
  sku: string;
  description: string;
  unit_price: string;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit_price: number | null;
  custom_data?: unknown;
  active?: boolean;
};

export function ProductRowActions({
  product,
  customFields,
  fieldLabels,
}: {
  product: ProductRow;
  customFields: CustomFieldDef[];
  fieldLabels: ProductFormLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = readRowCustomData(product);
  const isActive = product.active !== false;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateProduct(new FormData(event.currentTarget));
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onToggle() {
    setPending(true);
    const result = await setRecordActive("products", product.id, !isActive);
    setPending(false);
    if ("error" in result) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Ações do produto"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onToggle()} disabled={pending}>
            {isActive ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Editar produto</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto py-4">
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <input type="hidden" name="id" value={product.id} />
              <div className="space-y-2">
                <Label htmlFor={`prod-name-${product.id}`}>{fieldLabels.name} *</Label>
                <Input id={`prod-name-${product.id}`} name="name" required defaultValue={product.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`prod-sku-${product.id}`}>{fieldLabels.sku}</Label>
                <Input id={`prod-sku-${product.id}`} name="sku" defaultValue={product.sku ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`prod-desc-${product.id}`}>{fieldLabels.description}</Label>
                <Textarea
                  id={`prod-desc-${product.id}`}
                  name="description"
                  rows={3}
                  defaultValue={product.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`prod-price-${product.id}`}>{fieldLabels.unit_price}</Label>
                <Input
                  id={`prod-price-${product.id}`}
                  name="unit_price"
                  defaultValue={product.unit_price ?? 0}
                />
              </div>
              {customFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`prod-cf-${product.id}-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`prod-cf-${product.id}-${field.key}`}
                    name={`custom_${field.key}`}
                    defaultValue={custom[field.key] == null ? "" : String(custom[field.key])}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
