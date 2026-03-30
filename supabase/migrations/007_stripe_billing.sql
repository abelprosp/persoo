-- Stripe: IDs externos para Checkout e webhooks

alter table public.subscription_plans
  add column if not exists stripe_price_id text;

alter table public.subscription_plans
  add column if not exists stripe_product_id text;

comment on column public.subscription_plans.stripe_price_id is
  'Price ID do Stripe (price_...) para Checkout em modo subscription; preencher no Dashboard ou via SQL.';

alter table public.workspace_subscriptions
  add column if not exists stripe_customer_id text;

alter table public.workspace_subscriptions
  add column if not exists stripe_subscription_id text;

create unique index if not exists idx_workspace_subscriptions_stripe_sub
  on public.workspace_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
