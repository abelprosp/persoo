"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateSubscriptionPlan } from "@/app/app/admin/actions";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  trial_days: number;
  active: boolean;
};

export function PlanEditRow({ plan }: { plan: Plan }) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [priceReais, setPriceReais] = useState(
    String((plan.price_monthly_cents / 100).toFixed(2))
  );
  const [trialDays, setTrialDays] = useState(String(plan.trial_days));
  const [active, setActive] = useState(plan.active);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    const cents = Math.round(
      Number.parseFloat(priceReais.replace(",", ".")) * 100
    );
    if (Number.isNaN(cents) || cents < 0) {
      setMsg("Preço inválido");
      return;
    }
    const td = Number.parseInt(trialDays, 10);
    if (Number.isNaN(td) || td < 0) {
      setMsg("Dias de trial inválidos");
      return;
    }
    startTransition(async () => {
      const r = await updateSubscriptionPlan({
        id: plan.id,
        name,
        description,
        price_monthly_cents: cents,
        trial_days: td,
        active,
      });
      if ("error" in r) setMsg(r.error);
      else setMsg("Guardado.");
    });
  }

  return (
    <div className="rounded-xl border border-border/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">
        Slug: <code className="rounded bg-muted px-1">{plan.slug}</code>
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Preço mensal (R$)</Label>
          <Input
            value={priceReais}
            onChange={(e) => setPriceReais(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label>Dias de trial (ao atribuir como teste)</Label>
          <Input
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <label className="flex items-center gap-2 pt-8 text-sm">
          <Checkbox
            checked={active}
            onCheckedChange={(c) => setActive(c === true)}
          />
          Plano ativo (visível para atribuição)
        </label>
      </div>
      <div className="mt-3 space-y-2">
        <Label>Descrição</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "A guardar…" : "Guardar plano"}
        </Button>
        {msg && (
          <span className="text-sm text-muted-foreground" role="status">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
