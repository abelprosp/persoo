import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { userCanManageWorkspaceBilling } from "@/lib/workspace-billing";

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
      { error: "Stripe não está configurado." },
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

  const { data: subRow } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const customerId = subRow?.stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json(
      { error: "Ainda não existe cliente Stripe para este espaço. Subscreva primeiro." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const origin = appOrigin(request);
  const returnUrl = `${origin}/app/settings/billing`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}
