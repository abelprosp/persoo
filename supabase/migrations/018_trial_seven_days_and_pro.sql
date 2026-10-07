-- Teste grátis de 7 dias e plano Pro a R$ 79,90/mês.
-- Idempotente. Não apaga dados.
-- Workspaces já em teste local: trial_ends_at = created_at + 7 dias
-- (now() + 7 dias se não houver created_at), para quem criou o CRM há pouco
-- não ficar bloqueado no deploy. Subscrição Stripe com trial_ends_at mantém a data da Stripe.

alter table public.workspace_subscriptions
  add column if not exists trial_started_at timestamptz;

comment on column public.workspace_subscriptions.trial_started_at is
  'Início do teste grátis. Num teste local coincide com a criação do workspace; se a Stripe enviar trial_start, esse valor prevalece.';

update public.subscription_plans
set
  name = 'Teste grátis',
  description = 'Teste grátis de 7 dias, com até 2 CRMs.',
  trial_days = 7,
  price_monthly_cents = 0,
  updated_at = now()
where slug = 'trial';

update public.subscription_plans
set
  name = 'Pro',
  description = 'Plano Pro mensal do CRM.',
  price_monthly_cents = 7990,
  trial_days = 0,
  updated_at = now()
where slug = 'pro';

update public.workspace_subscriptions s
set trial_started_at = coalesce(w.created_at, s.created_at, now())
from public.workspaces w
where w.id = s.workspace_id
  and s.trial_started_at is null
  and s.stripe_subscription_id is null;

update public.workspace_subscriptions s
set
  trial_started_at = coalesce(w.created_at, now()),
  trial_ends_at = coalesce(w.created_at, now()) + interval '7 days'
from public.workspaces w
where w.id = s.workspace_id
  and s.stripe_subscription_id is null
  and s.status = 'trialing';

insert into public.workspace_subscriptions (
  workspace_id,
  plan_id,
  status,
  trial_started_at,
  trial_ends_at,
  updated_at
)
select
  w.id,
  p.id,
  'trialing',
  coalesce(w.created_at, now()),
  coalesce(w.created_at, now()) + interval '7 days',
  now()
from public.workspaces w
join public.subscription_plans p on p.slug = 'trial'
where not exists (
  select 1
  from public.workspace_subscriptions s
  where s.workspace_id = w.id
);

-- O fim dos 7 dias pede o plano Pro no popup, sem esconder os dados nem a faturação.
-- Continua a exigir subscrição ativa (ou teste) e a bloquear past_due, cancelada e expirada.
create or replace function public.workspace_access_allowed(wid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from workspace_subscriptions s where s.workspace_id=wid and
   (s.status = 'trialing' or
    (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))))
$$;
