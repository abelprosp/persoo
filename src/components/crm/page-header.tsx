"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
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
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{breadcrumb}</span>
          <span className="text-muted-foreground">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground">
              {viewLabel}
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Lista</DropdownMenuItem>
              <DropdownMenuItem>Kanban</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
            ) : (
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800" type="button">
                <Plus className="mr-2 size-4" />
                Criar
              </Button>
            )))}
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
