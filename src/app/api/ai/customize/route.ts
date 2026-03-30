import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const TRIAL_AI_CREDITS_TOTAL = 7;
const PRO_AI_CREDITS_MONTHLY = 30;

const SYSTEM = `Você é um assistente que define personalização de CRM SaaS por vertical comercial.
Responda APENAS com JSON válido no formato:
{
  "industry": "nome curto do setor em português",
  "moduleLabels": {
    "notifications": "rótulo opcional do menu",
    "dashboard": "rótulo opcional",
    "leads": "rótulo opcional",
    "deals": "rótulo opcional",
    "contacts": "rótulo opcional",
    "organizations": "rótulo opcional",
    "products": "rótulo opcional (ex.: SKUs, Serviços, Planos)",
    "notes": "rótulo opcional",
    "tasks": "rótulo opcional"
  },
  "entityLabels": {
    "organizations": { "annual_revenue": "rótulo alternativo opcional" },
    "leads": { "full_name": "rótulo opcional", "company": "rótulo opcional" },
    "deals": { "title": "rótulo opcional", "value": "rótulo opcional" },
    "contacts": {},
    "tasks": {},
    "products": { "name": "rótulo opcional", "unit_price": "rótulo opcional" }
  },
  "customFields": {
    "organizations": [{"key": "snake_case", "label": "rótulo PT", "type": "text|number|date"}],
    "leads": [],
    "deals": [],
    "contacts": [],
    "tasks": [],
    "products": []
  },
  "kanban": {
    "leads": [
      { "id": "snake_case_pt", "title": "Nome da coluna em português" }
    ],
    "deals": [
      { "id": "snake_case_pt", "title": "Nome da coluna em português" }
    ]
  },
  "summary": "uma frase explicando a personalização"
}
Regras importantes:
- kanban.leads e kanban.deals: listas com 4 a 7 colunas cada, na ordem do fluxo comercial. Cada item tem "id" (snake_case, minúsculas, letras ASCII, começa com letra) e "title" (rótulo curto em português). Estes ids são gravados em leads.status e deals.stage.
- Inclua em moduleLabels apenas entradas que queira renomear no menu. Use customFields para campos extra. products: catálogo / planos / SKUs conforme a vertical.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 8) {
    return NextResponse.json(
      { error: "Descreva o negócio com pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Configure OPENAI_API_KEY no servidor para usar a personalização por IA.",
      },
      { status: 503 }
    );
  }

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) {
    return NextResponse.json(
      { error: "Espaço de trabalho não encontrado" },
      { status: 404 }
    );
  }

  const prevSchema =
    active.ai_schema &&
    typeof active.ai_schema === "object" &&
    !Array.isArray(active.ai_schema)
      ? (active.ai_schema as Record<string, unknown>)
      : {};

  const rawUsed = Number(prevSchema.ai_customize_trial_used ?? 0);
  const trialUsed = Number.isFinite(rawUsed) && rawUsed > 0 ? rawUsed : 0;
  const rawProUsed = Number(prevSchema.ai_customize_pro_used ?? 0);
  const proUsedStored =
    Number.isFinite(rawProUsed) && rawProUsed > 0 ? rawProUsed : 0;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const storedProMonth =
    typeof prevSchema.ai_customize_pro_month === "string"
      ? prevSchema.ai_customize_pro_month
      : "";
  const proUsed = storedProMonth === currentMonth ? proUsedStored : 0;

  const { data: subRow, error: subErr } = await supabase
    .from("workspace_subscriptions")
    .select("status, subscription_plans ( slug )")
    .eq("workspace_id", active.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    subErr &&
    !subErr.message.includes(`relation "workspace_subscriptions" does not exist`)
  ) {
    console.warn("ai customize subscription read", subErr.message);
  }

  const isTrial = subRow?.status === "trialing";
  const planSlug =
    subRow &&
    typeof subRow === "object" &&
    !Array.isArray(subRow) &&
    subRow.subscription_plans &&
    typeof subRow.subscription_plans === "object" &&
    !Array.isArray(subRow.subscription_plans) &&
    typeof (subRow.subscription_plans as Record<string, unknown>).slug === "string"
      ? String((subRow.subscription_plans as Record<string, unknown>).slug)
      : "";
  const isPro = planSlug === "pro" && subRow?.status === "active";

  if (isTrial && trialUsed >= TRIAL_AI_CREDITS_TOTAL) {
    return NextResponse.json(
      {
        error:
          "Limite do trial atingido: 7 créditos de personalização de CRM já utilizados.",
        trialCredits: {
          total: TRIAL_AI_CREDITS_TOTAL,
          used: trialUsed,
          remaining: 0,
        },
      },
      { status: 402 }
    );
  }
  if (isPro && proUsed >= PRO_AI_CREDITS_MONTHLY) {
    return NextResponse.json(
      {
        error:
          "Limite mensal do plano Pro atingido: 30 créditos de personalização já utilizados neste mês.",
        monthlyCredits: {
          plan: "pro",
          month: currentMonth,
          total: PRO_AI_CREDITS_MONTHLY,
          used: proUsed,
          remaining: 0,
        },
      },
      { status: 402 }
    );
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Negócio / vertical: ${description}\nGere a personalização JSON.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("OpenAI error", t);
    return NextResponse.json(
      { error: "Falha ao chamar o modelo de IA." },
      { status: 502 }
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as Record<
      string,
      unknown
    >;
  } catch {
    return NextResponse.json(
      { error: "Resposta da IA inválida. Tente de novo." },
      { status: 502 }
    );
  }

  const industry =
    typeof parsed.industry === "string" ? parsed.industry : "Geral";

  const prevKanban =
    prevSchema.kanban &&
    typeof prevSchema.kanban === "object" &&
    !Array.isArray(prevSchema.kanban)
      ? (prevSchema.kanban as Record<string, unknown>)
      : {};

  const newKanbanRaw = parsed.kanban;
  const newKanban =
    newKanbanRaw &&
    typeof newKanbanRaw === "object" &&
    !Array.isArray(newKanbanRaw)
      ? (newKanbanRaw as Record<string, unknown>)
      : {};

  const mergedKanban: Record<string, unknown> = { ...prevKanban };
  if (Array.isArray(newKanban.leads)) {
    mergedKanban.leads = newKanban.leads;
  } else if (!Array.isArray(mergedKanban.leads)) {
    delete mergedKanban.leads;
  }
  if (Array.isArray(newKanban.deals)) {
    mergedKanban.deals = newKanban.deals;
  } else if (!Array.isArray(mergedKanban.deals)) {
    delete mergedKanban.deals;
  }

  const nextSchema: Record<string, unknown> = { ...parsed, industry };
  if (
    prevSchema.dashboard &&
    typeof prevSchema.dashboard === "object" &&
    !Array.isArray(prevSchema.dashboard)
  ) {
    nextSchema.dashboard = prevSchema.dashboard;
  }
  delete nextSchema.kanban;
  if (Object.keys(mergedKanban).length > 0) {
    nextSchema.kanban = mergedKanban;
  }
  const nextTrialUsed =
    isTrial && trialUsed < TRIAL_AI_CREDITS_TOTAL ? trialUsed + 1 : trialUsed;
  nextSchema.ai_customize_trial_used = nextTrialUsed;
  if (isPro) {
    nextSchema.ai_customize_pro_month = currentMonth;
    nextSchema.ai_customize_pro_used =
      proUsed < PRO_AI_CREDITS_MONTHLY ? proUsed + 1 : proUsed;
  } else if (storedProMonth === currentMonth) {
    nextSchema.ai_customize_pro_month = storedProMonth;
    nextSchema.ai_customize_pro_used = proUsed;
  }

  const { error: upErr } = await supabase
    .from("workspaces")
    .update({
      industry,
      ai_schema: nextSchema as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.id);

  if (upErr) {
    console.error("workspace ai_schema update", upErr.message);
    return NextResponse.json(
      { error: "Não foi possível guardar a personalização." },
      { status: 500 }
    );
  }

  // Sidebar (layout), dashboard e listas leem `ai_schema` / `industry` no servidor.
  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/leads");
  revalidatePath("/app/deals");

  return NextResponse.json({
    schema: nextSchema,
    trialCredits: {
      total: TRIAL_AI_CREDITS_TOTAL,
      used: nextTrialUsed,
      remaining: Math.max(0, TRIAL_AI_CREDITS_TOTAL - nextTrialUsed),
    },
    monthlyCredits: isPro
      ? {
          plan: "pro",
          month: currentMonth,
          total: PRO_AI_CREDITS_MONTHLY,
          used: Math.min(PRO_AI_CREDITS_MONTHLY, proUsed + 1),
          remaining: Math.max(0, PRO_AI_CREDITS_MONTHLY - (proUsed + 1)),
        }
      : undefined,
  });
}
