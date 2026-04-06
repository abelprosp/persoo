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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
            {breadcrumb}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-zinc-300 sm:inline">/</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 rounded-full border border-white/60 bg-white/50 px-3 py-1 text-zinc-600 shadow-sm ring-1 ring-white/70 backdrop-blur-md hover:bg-white/80 hover:text-zinc-900">
                {viewLabel}
                <ChevronDown className="size-4 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Lista</DropdownMenuItem>
                <DropdownMenuItem>Kanban</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {showCreate &&
          (createSlot ??
            (createHref ? (
              <Link
                href={createHref}
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                  "rounded-full bg-zinc-900 text-white shadow-md shadow-zinc-900/20 hover:bg-zinc-800"
                )}
              >
                <Plus className="mr-2 size-4" />
                Criar
              </Link>
            ) : (
              <Button
                className="rounded-full bg-zinc-900 text-white shadow-md shadow-zinc-900/20 hover:bg-zinc-800"
                type="button"
              >
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
