import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markWorkspaceSubscriptionCanceledByStripeId,
  markWorkspaceSubscriptionPastDueByStripeId,
  upsertWorkspaceSubscriptionFromStripe,
} from "@/lib/stripe-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe off" }, { status: 503 });
  }

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!whSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET em falta");
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Sem assinatura" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "assinatura inválida";
    console.error("[stripe webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[stripe webhook] admin client", e);
    return NextResponse.json({ error: "Supabase service role em falta" }, { status: 503 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const subId = session.subscription;
        if (typeof subId !== "string") break;
        const stripeSub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data"],
        });
        await upsertWorkspaceSubscriptionFromStripe(admin, stripeSub, {
          workspace_id: session.metadata?.workspace_id ?? undefined,
          plan_id: session.metadata?.plan_id ?? undefined,
        });
        break;
      }
      case "customer.subscription.updated": {
        const raw = event.data.object as Stripe.Subscription;
        const stripeSub = await stripe.subscriptions.retrieve(raw.id, {
          expand: ["items.data"],
        });
        await upsertWorkspaceSubscriptionFromStripe(admin, stripeSub);
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await markWorkspaceSubscriptionCanceledByStripeId(admin, stripeSub.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parent = invoice.parent;
        const subRef =
          parent?.type === "subscription_details"
            ? parent.subscription_details?.subscription
            : null;
        const subId =
          typeof subRef === "string" ? subRef : subRef && "id" in subRef ? subRef.id : null;
        if (subId) {
          await markWorkspaceSubscriptionPastDueByStripeId(admin, subId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler", event.type, e);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
