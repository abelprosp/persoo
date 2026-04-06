"use client";

import type React from "react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Pencil, RefreshCw, User } from "lucide-react";
import { SeedDemoButton } from "@/components/crm/seed-demo-button";
import { ClearDemoButton } from "@/components/crm/clear-demo-button";
import { DashboardEditDialog } from "@/components/crm/dashboard-edit-dialog";
import type { DashboardPrefs } from "@/lib/dashboard-prefs";
import type { TeamScope } from "@/lib/dashboard-prefs";

type Props = {
  days: 7 | 30 | 90;
  team: TeamScope;
  prefs: DashboardPrefs;
  children?: React.ReactNode;
};

export function DashboardToolbar({ days, team, prefs, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [editOpen, setEditOpen] = useState(false);

  function setQuery(next: { days?: 7 | 30 | 90; team?: TeamScope }) {
    const p = new URLSearchParams();
    p.set("days", String(next.days ?? days));
    p.set("team", next.team ?? team);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Indicadores e tendências do teu CRM
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/45 p-1.5 shadow-sm ring-1 ring-white/70 backdrop-blur-md">
          <SeedDemoButton />
          <ClearDemoButton />
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="rounded-xl border-zinc-200/80 bg-white/80"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="mr-2 size-4" />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="rounded-xl border-zinc-200/80 bg-white/80"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 size-4" />
            Editar
          </Button>
        </div>
      </div>

      {children}

      <div className="flex flex-wrap gap-3">
        <Select
          value={String(days)}
          onValueChange={(v) =>
            setQuery({ days: Number(v) as 7 | 30 | 90, team })
          }
        >
          <SelectTrigger className="w-[200px] rounded-2xl border-white/60 bg-white/60 shadow-sm ring-1 ring-white/70 backdrop-blur-md">
            <CalendarDays className="mr-2 size-4" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={team}
          onValueChange={(v) =>
            setQuery({ days, team: v as TeamScope })
          }
        >
          <SelectTrigger className="w-[200px] rounded-2xl border-white/60 bg-white/60 shadow-sm ring-1 ring-white/70 backdrop-blur-md">
            <User className="mr-2 size-4" />
            <SelectValue placeholder="Utilizador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Equipa de vendas</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DashboardEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        prefs={prefs}
      />
    </>
  );
}
