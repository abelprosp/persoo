"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { saveDashboardPreferences } from "@/app/app/dashboard/actions";
import {
  type DashboardPrefs,
  type KpiId,
  KPI_DEFINITIONS,
  isKpiVisible,
  kpiLabel,
} from "@/lib/dashboard-prefs";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: DashboardPrefs;
};

export function DashboardEditDialog({ open, onOpenChange, prefs }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [labels, setLabels] = useState<Record<KpiId, string>>(
    {} as Record<KpiId, string>
  );
  const [visible, setVisible] = useState<Record<KpiId, boolean>>(
    {} as Record<KpiId, boolean>
  );

  useEffect(() => {
    if (!open) return;
    const l = {} as Record<KpiId, string>;
    const v = {} as Record<KpiId, boolean>;
    for (const def of KPI_DEFINITIONS) {
      l[def.id] = kpiLabel(def.id, prefs);
      v[def.id] = isKpiVisible(def.id, prefs);
    }
    setLabels(l);
    setVisible(v);
    setError(null);
  }, [open, prefs]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const hiddenKpis = KPI_DEFINITIONS.filter(
      (d) => !(visible[d.id] ?? isKpiVisible(d.id, prefs))
    ).map((d) => d.id);
    const mergedLabels: Record<string, string> = {};
    for (const def of KPI_DEFINITIONS) {
      mergedLabels[def.id] =
        labels[def.id] !== undefined
          ? labels[def.id]
          : kpiLabel(def.id, prefs);
    }
    const r = await saveDashboardPreferences({
      labels: mergedLabels,
      hiddenKpis,
    });
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Editar dashboard</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Personalize o texto dos cartões e escolha quais mostrar. As
            preferências ficam guardadas neste espaço de trabalho.
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="grid gap-4 py-4">
            {KPI_DEFINITIONS.map((def) => (
              <div
                key={def.id}
                className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-end sm:gap-3"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={`kpi-label-${def.id}`} className="text-xs">
                    {def.defaultLabel}
                  </Label>
                  <Input
                    id={`kpi-label-${def.id}`}
                    value={
                      labels[def.id] !== undefined
                        ? labels[def.id]
                        : kpiLabel(def.id, prefs)
                    }
                    onChange={(e) =>
                      setLabels((prev) => ({
                        ...prev,
                        [def.id]: e.target.value,
                      }))
                    }
                    placeholder={def.defaultLabel}
                  />
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={
                      visible[def.id] ?? isKpiVisible(def.id, prefs)
                    }
                    onCheckedChange={(c) =>
                      setVisible((prev) => ({
                        ...prev,
                        [def.id]: c === true,
                      }))
                    }
                  />
                  Mostrar
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
