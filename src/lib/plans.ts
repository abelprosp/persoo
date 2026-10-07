/** Plano Pro e regras do teste grátis. Única fonte dos valores mostrados na UI. */

export const TRIAL_DAYS = 7;
export const TRIAL_MAX_WORKSPACES = 2;

export const PRO_PLAN = {
  slug: "pro",
  name: "Pro",
  priceMonthlyCents: 7990,
  currency: "BRL",
  intervalLabel: "mês",
} as const;

/** Variável que o botão Assinar espera. Sem valor (nem `subscription_plans.stripe_price_id`), não chama o Stripe. */
export const STRIPE_PRICE_PRO_ENV = "STRIPE_PRICE_ID_PRO";

export const STRIPE_CHECKOUT_UNAVAILABLE_MESSAGE =
  "A cobrança fica disponível quando o Stripe for configurado.";

export function formatPlanPriceBRL(
  cents: number = PRO_PLAN.priceMonthlyCents
): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: PRO_PLAN.currency,
  }).format(cents / 100);
}

export function proMonthlyPriceLabel(): string {
  return `${formatPlanPriceBRL(PRO_PLAN.priceMonthlyCents)}/${PRO_PLAN.intervalLabel}`;
}

export function trialWorkspaceLimitMessage(): string {
  return `No teste grátis só é possível criar ${TRIAL_MAX_WORKSPACES} CRMs. Assine o plano ${PRO_PLAN.name} por ${proMonthlyPriceLabel()} para criar mais.`;
}

