"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  workspaceName: string;
};

const ACTIVATION_PHONE_E164 = "+5551995501677";
const ACTIVATION_PHONE_DISPLAY = "(51) 99550-1677";

export function BillingStripeClient({ workspaceName }: Props) {
  const telHref = `tel:${ACTIVATION_PHONE_E164}`;

  return (
    <Card className="border-emerald-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Ativação do plano Pro</CardTitle>
        <CardDescription>
          Ligue para o PersooCRM e indique o espaço «{workspaceName}» para
          ativar o Pro.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <a
          href={telHref}
          className={cn(
            buttonVariants(),
            "w-fit bg-emerald-700 text-white hover:bg-emerald-800"
          )}
        >
          {`Ligar ${ACTIVATION_PHONE_DISPLAY}`}
        </a>
        <p className="text-xs text-muted-foreground">
          Abre a app de telefone no telemóvel ou computador. A ativação é
          concluída manualmente após o contacto.
        </p>
      </CardContent>
    </Card>
  );
}
