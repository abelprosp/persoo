"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignWorkspaceSubscription } from "@/app/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Ws = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

type Sub = {
  workspace_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
};

type PlanOpt = { id: string; slug: string; name: string };

export function WorkspacesAdmin({
  workspaces,
  subs,
  plans,
}: {
  workspaces: Ws[];
  subs: Sub[];
  plans: PlanOpt[];
}) {
  const router = useRouter();
  const subByWs = new Map(subs.map((s) => [s.workspace_id, s]));
  const defaultPlan = plans[0]?.id ?? "";

  const [planByWs, setPlanByWs] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const w of workspaces) {
      o[w.id] = subByWs.get(w.id)?.plan_id ?? defaultPlan;
    }
    return o;
  });

  const [modeByWs, setModeByWs] = useState<Record<string, "trial" | "active_monthly">>(
    () =>
      Object.fromEntries(
        workspaces.map((w) => [w.id, "trial" as const])
      ) as Record<string, "trial" | "active_monthly">
  );

  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(workspaceId: string) {
    setMsg(null);
    const planId = planByWs[workspaceId];
    if (!planId) {
      setMsg("Escolha um plano.");
      return;
    }
    startTransition(async () => {
      const r = await assignWorkspaceSubscription(
        workspaceId,
        planId,
        modeByWs[workspaceId] ?? "trial"
      );
      if ("error" in r) setMsg(r.error);
      else {
        setMsg("Assinatura atualizada.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Espaço</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Trial até</TableHead>
              <TableHead>Período até</TableHead>
              <TableHead className="min-w-[280px]">Atribuir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Sem espaços.
                </TableCell>
              </TableRow>
            ) : (
              workspaces.map((w) => {
                const s = subByWs.get(w.id);
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s?.status ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s?.trial_ends_at
                        ? new Date(s.trial_ends_at).toLocaleString("pt-PT")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s?.current_period_end
                        ? new Date(s.current_period_end).toLocaleString("pt-PT")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={planByWs[w.id] ?? ""}
                          onValueChange={(v) =>
                            setPlanByWs((prev) => ({
                              ...prev,
                              [w.id]: v ?? "",
                            }))
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.slug})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={modeByWs[w.id] ?? "trial"}
                          onValueChange={(v) =>
                            setModeByWs((prev) => ({
                              ...prev,
                              [w.id]: v as "trial" | "active_monthly",
                            }))
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Modo trial</SelectItem>
                            <SelectItem value="active_monthly">
                              Assinatura ativa (1 mês)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => apply(w.id)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
