"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRO_PLAN, TRIAL_DAYS, proMonthlyPriceLabel } from "@/lib/plans";

/**
 * Fecha durante esta visita (incluindo navegações dentro de /app).
 * Um carregamento novo da área autenticada volta a abrir o diálogo.
 */
let dismissedUntilReload = false;

export function ProTrialDialog() {
  const [open, setOpen] = useState(!dismissedUntilReload);
  const price = proMonthlyPriceLabel();

  function close(next: boolean) {
    if (!next) dismissedUntilReload = true;
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>O teste grátis terminou</DialogTitle>
          <DialogDescription>
            Os {TRIAL_DAYS} dias de teste deste CRM acabaram. Assine o plano{" "}
            {PRO_PLAN.name} por {price} para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Agora não
          </Button>
          <Link
            href="/app/settings/billing"
            className={cn(buttonVariants())}
            onClick={() => close(false)}
          >
            Assinar o {PRO_PLAN.name}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
