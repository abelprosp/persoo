"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PRO_PLAN,
  STRIPE_CHECKOUT_UNAVAILABLE_MESSAGE,
  proMonthlyPriceLabel,
} from "@/lib/plans";

type Props = {
  workspaceId: string;
  workspaceName: string;
  checkoutReady: boolean;
};

export function BillingStripeClient({
  workspaceId,
  workspaceName,
  checkoutReady,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = proMonthlyPriceLabel();

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Não foi possível iniciar a assinatura.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Não foi possível iniciar a assinatura.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-emerald-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Plano {PRO_PLAN.name}</CardTitle>
        <CardDescription>
          {price} para o espaço «{workspaceName}».
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-2xl font-semibold tracking-tight">
          {price}
        </p>
        {checkoutReady ? (
          <Button
            type="button"
            className="w-fit bg-emerald-700 text-white hover:bg-emerald-800"
            disabled={busy}
            onClick={() => void subscribe()}
          >
            {busy ? "A abrir pagamento…" : "Assinar"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {STRIPE_CHECKOUT_UNAVAILABLE_MESSAGE}
          </p>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
