"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  workspaceName: string;
  showSubscribeCta: boolean;
};

export function BillingStripeClient({ workspaceName, showSubscribeCta }: Props) {
  const msg = encodeURIComponent(
    `quero ativar o plano pro do persooCRM (workspace: ${workspaceName})`
  );
  const whatsappUrl = `https://wa.me/5551995501677?text=${msg}`;

  return (
    <Card className="border-emerald-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Ativacao do plano Pro</CardTitle>
        <CardDescription>
          A integracao automatica com Stripe foi removida. A ativacao do plano
          Pro e feita manualmente via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {showSubscribeCta ? (
          <Button
            type="button"
            className="bg-emerald-700 text-white hover:bg-emerald-800"
            onClick={() => window.open(whatsappUrl, "_blank", "noreferrer")}
          >
            Ativar plano Pro no WhatsApp
          </Button>
        ) : null}
        <p className="w-full text-xs text-muted-foreground">
          Mensagem enviada: "quero ativar o plano pro do persooCRM". A ativacao
          sera feita manualmente.
        </p>
      </CardContent>
    </Card>
  );
}
