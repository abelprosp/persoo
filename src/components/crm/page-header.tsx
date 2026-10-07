"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  breadcrumb: string;
  viewLabel?: string;
  createHref?: string | null;
  /** Substituir o botão Criar (ex.: diálogo) */
  createSlot?: React.ReactNode;
  /** Se false, não mostra o botão Criar */
  showCreate?: boolean;
  toolbar?: React.ReactNode;
  filtersLeft?: React.ReactNode;
};

export function PageHeader({
  breadcrumb,
  viewLabel = "Lista",
  createHref,
  createSlot,
  showCreate = true,
  toolbar,
  filtersLeft,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{breadcrumb}</h1><p className="mt-1 text-sm text-muted-foreground">{viewLabel}</p></div>
        {showCreate &&
          (createSlot ??
            (createHref ? (
              <Link
                href={createHref}
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                  "bg-zinc-900 text-white hover:bg-zinc-800"
                )}
              >
                <Plus className="mr-2 size-4" />
                Criar
              </Link>
            ) : null))}
      </div>
      {(filtersLeft || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">{filtersLeft}</div>
          {toolbar}
        </div>
      )}
    </div>
  );
}
