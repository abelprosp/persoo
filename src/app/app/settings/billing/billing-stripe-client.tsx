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

type Props = {
  workspaceId: string;
  stripeReady: boolean;
  /** Já existe cliente Stripe (pode abrir portal). */
  hasStripeCustomer: boolean;
  /** Mostrar CTA de compra (trial / cancelado / expirado — não ativo nem past_due). */
  showSubscribeCta: boolean;
};

export function BillingStripeClient({
  workspaceId,
  stripeReady,
  hasStripeCustomer,
  showSubscribeCta,
}: Props) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    setLoading("checkout");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Resposta inválida do servidor.");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setError(null);
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Não foi possível abrir o portal.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Resposta inválida do servidor.");
    } finally {
      setLoading(null);
    }
  }

  if (!stripeReady) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Pagamentos Stripe</CardTitle>
          <CardDescription>
            Para ativar compras com cartão, defina{" "}
            <code className="rounded bg-muted px-1 text-xs">
              STRIPE_SECRET_KEY
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 text-xs">
              STRIPE_WEBHOOK_SECRET
            </code>{" "}
            e{" "}
            <code className="rounded bg-muted px-1 text-xs">
              STRIPE_PRICE_ID_PRO
            </code>{" "}
            (ou preencha{" "}
            <code className="rounded bg-muted px-1 text-xs">
              stripe_price_id
            </code>{" "}
            no plano pro na base de dados). Use também{" "}
            <code className="rounded bg-muted px-1 text-xs">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            para o webhook atualizar a subscrição.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Subscrição paga (Stripe)</CardTitle>
        <CardDescription>
          Compre ou gere o plano <strong>Profissional</strong> com cartão. O
          estado do espaço atualiza automaticamente após o pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {showSubscribeCta ? (
          <Button
            type="button"
            className="bg-emerald-700 text-white hover:bg-emerald-800"
            disabled={loading !== null}
            onClick={() => {
              void startCheckout();
            }}
          >
            {loading === "checkout"
              ? "A redirecionar…"
              : "Subscrever plano Profissional"}
          </Button>
        ) : null}

        {hasStripeCustomer ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading !== null}
            onClick={() => {
              void openPortal();
            }}
          >
            {loading === "portal"
              ? "A abrir portal…"
              : "Gerir faturação e método de pagamento"}
          </Button>
        ) : null}

        {error ? (
          <p className="w-full text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
