import Link from "next/link";
import { SignOutButton } from "@/components/crm/sign-out-button";
export default function BillingBlockedPage() {
  return <section className="mx-auto max-w-lg space-y-5 rounded-2xl border bg-white p-6"><h1 className="text-2xl font-semibold">Vamos regularizar seu acesso</h1><p className="text-muted-foreground">Sua assinatura precisa de atenção. Seus dados permanecem salvos. O responsável pela empresa pode atualizar o pagamento para continuar.</p><Link className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-white" href="/app/settings/billing">Gerenciar assinatura</Link><div><SignOutButton /></div></section>;
}
