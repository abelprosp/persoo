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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SeedDemoButton />
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="mr-2 size-4" />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
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
          <SelectTrigger className="w-[200px] bg-white">
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
          <SelectTrigger className="w-[200px] bg-white">
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
