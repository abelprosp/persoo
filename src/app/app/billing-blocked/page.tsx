import Link from "next/link";
import { linkButtonOutline } from "@/lib/link-as-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BillingBlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const reason = sp.reason ?? "";

  const copy: Record<string, string> = {
    trial_expired: "O período de trial deste espaço de trabalho terminou.",
    subscription_expired: "A subscrição deste espaço expirou ou o pagamento está em falta.",
    canceled: "A subscrição foi cancelada.",
  };

  const message = copy[reason] ?? "Não é possível aceder ao CRM com este espaço de trabalho.";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="border-amber-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Acesso limitado</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={linkButtonOutline}>
            Terminar sessão
          </Link>
          <p className="text-sm text-muted-foreground self-center">
            Peça a um administrador da plataforma para atribuir um plano ou
            renovar a subscrição.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
