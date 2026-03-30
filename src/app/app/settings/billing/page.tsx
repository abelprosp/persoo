import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { isSuperAdmin } from "@/lib/admin";
import {
  evaluateWorkspaceAccess,
  formatPlanPriceEUR,
  subscriptionStatusLabelPt,
  type WorkspaceSubscriptionRow,
} from "@/lib/subscriptions";
import {
  linkButtonOutlineSm,
  linkButtonSecondarySm,
} from "@/lib/link-as-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BillingStripeClient } from "./billing-stripe-client";

export default async function BillingSettingsPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getWorkspaceContext(supabase, user.id);
  const ws = ctx.active;
  if (!ws) redirect("/app/dashboard");

  const { data: subRow } = await supabase
    .from("workspace_subscriptions")
    .select(
      `
      id,
      workspace_id,
      plan_id,
      status,
      trial_ends_at,
      current_period_end,
      subscription_plans ( slug, name, price_monthly_cents, trial_days )
    `
    )
    .eq("workspace_id", ws.id)
    .maybeSingle();

  const plan = subRow?.subscription_plans as
    | {
        slug: string;
        name: string;
        price_monthly_cents: number;
        trial_days: number;
      }
    | null
    | undefined;

  const sub = (subRow as WorkspaceSubscriptionRow | null) ?? null;
  const superUser = await isSuperAdmin(supabase, user);
  const access = evaluateWorkspaceAccess(sub, { bypass: superUser });

  const { data: myMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", ws.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: wsOwner } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", ws.id)
    .single();

  const canDiscussPlan =
    wsOwner?.owner_id === user.id ||
    myMember?.role === "owner" ||
    myMember?.role === "admin";

  const showSubscribeCta = Boolean(
    canDiscussPlan &&
      subRow &&
      subRow.status !== "active" &&
      subRow.status !== "past_due"
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Faturação</h2>
      <p className="text-sm text-muted-foreground -mt-4">
        Plano e estado do espaço ativo:{" "}
        <span className="font-medium text-foreground">{ws.name}</span>. Troque
        de espaço no menu superior para ver outro.
      </p>

      {canDiscussPlan ? (
        <BillingStripeClient
          workspaceName={ws.name}
          showSubscribeCta={showSubscribeCta}
        />
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Plano e acesso</CardTitle>
          <CardDescription>
            Resumo da subscrição associada a este workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!subRow ? (
            <p className="text-muted-foreground">
              Não há registo de subscrição para este espaço. O acesso pode
              depender da configuração do projeto ou de um plano atribuído em
              breve.
            </p>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Plano</dt>
                <dd className="font-medium">
                  {plan?.name ?? "—"}
                  {plan?.slug ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({plan.slug})
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="font-medium">
                  {subscriptionStatusLabelPt(subRow.status)}
                </dd>
              </div>
              {plan && plan.price_monthly_cents > 0 ? (
                <div>
                  <dt className="text-muted-foreground">Preço indicativo</dt>
                  <dd className="font-medium">
                    {formatPlanPriceEUR(plan.price_monthly_cents)} / mês
                  </dd>
                </div>
              ) : null}
              {subRow.trial_ends_at ? (
                <div>
                  <dt className="text-muted-foreground">Trial até</dt>
                  <dd className="font-medium">
                    {new Date(subRow.trial_ends_at).toLocaleString("pt-PT")}
                  </dd>
                </div>
              ) : null}
              {subRow.current_period_end ? (
                <div>
                  <dt className="text-muted-foreground">Período atual até</dt>
                  <dd className="font-medium">
                    {new Date(subRow.current_period_end).toLocaleString(
                      "pt-PT"
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}

          {!access.ok ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-950">
              <p className="font-medium">Acesso limitado</p>
              <p className="mt-1 text-xs text-amber-900/90">
                {access.message}
              </p>
              <Link
                href={`/app/billing-blocked?reason=${access.reason}`}
                className={cn(linkButtonOutlineSm, "mt-3 border-amber-300")}
              >
                Ver detalhes
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              O acesso ao CRM neste espaço está válido face ao estado atual da
              subscrição.
            </p>
          )}

          {subRow?.status === "past_due" ? (
            <p className="text-sm text-amber-900/90">
              O pagamento está em atraso. Contacte o suporte para regularização
              manual do plano.
            </p>
          ) : null}

          {canDiscussPlan ? (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3 text-muted-foreground">
              <p className="text-sm font-medium text-foreground">
                Atribuição manual de planos
              </p>
              <p className="mt-1 text-xs">
                Administradores da plataforma podem ainda ajustar planos na
                consola de administração.
              </p>
              {superUser ? (
                <Link
                  href="/app/admin/workspaces"
                  className={cn(linkButtonSecondarySm, "mt-3")}
                >
                  Admin — espaços
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Para questões de faturação ou upgrade, contacte o dono ou um
              administrador deste espaço.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
