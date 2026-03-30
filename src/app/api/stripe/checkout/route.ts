import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  resolveStripePriceId,
  userCanManageWorkspaceBilling,
  type PlanForCheckout,
} from "@/lib/workspace-billing";

function appOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = request.headers.get("origin") ?? request.headers.get("referer");
  if (h) {
    try {
      return new URL(h).origin;
    } catch {
      /* fallthrough */
    }
  }
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe não está configurado no servidor." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { workspaceId?: string };
  try {
    body = (await request.json()) as { workspaceId?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId em falta." }, { status: 400 });
  }

  const allowed = await userCanManageWorkspaceBilling(
    supabase,
    user.id,
    workspaceId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (
    existing?.stripe_subscription_id &&
    existing.status === "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Este espaço já tem uma subscrição Stripe ativa. Use «Gerir faturação».",
      },
      { status: 409 }
    );
  }

  const { data: plan, error: planErr } = await supabase
    .from("subscription_plans")
    .select("id, slug, name, stripe_price_id")
    .eq("slug", "pro")
    .eq("active", true)
    .maybeSingle();

  if (planErr || !plan) {
    return NextResponse.json(
      { error: "Plano pago (pro) não encontrado na base de dados." },
      { status: 500 }
    );
  }

  const priceId = resolveStripePriceId(plan as PlanForCheckout);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Defina STRIPE_PRICE_ID_PRO no .env ou subscription_plans.stripe_price_id para o plano pro.",
      },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const origin = appOrigin(request);
  const successUrl = `${origin}/app/settings/billing?checkout=success`;
  const cancelUrl = `${origin}/app/settings/billing?checkout=cancel`;

  const { data: subRow } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const existingCustomerId = subRow?.stripe_customer_id?.trim() || undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: workspaceId,
    metadata: {
      workspace_id: workspaceId,
      plan_id: plan.id,
      user_id: user.id,
    },
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
        plan_id: plan.id,
      },
    },
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : {
          customer_email: user.email ?? undefined,
        }),
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "O Stripe não devolveu URL de checkout." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
