import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { AiEntityName, NavModuleKey } from "@/lib/ai-schema";

const MODULES = [
  "leads",
  "deals",
  "contacts",
  "organizations",
  "products",
  "tasks",
  "notes",
] as const;

const MODULE_ENTITY: Partial<Record<NavModuleKey, AiEntityName>> = {
  leads: "leads",
  deals: "deals",
  contacts: "contacts",
  organizations: "organizations",
  products: "products",
  tasks: "tasks",
};

const MODULE_LABEL_FALLBACK: Record<(typeof MODULES)[number], string> = {
  leads: "Leads",
  deals: "Negócios",
  contacts: "Contatos",
  organizations: "Organizações",
  products: "Produtos",
  tasks: "Tarefas",
  notes: "Notas",
};

const SYSTEM = `Você personaliza UM módulo de CRM por vez.
Responda APENAS com JSON válido neste formato:
{
  "moduleLabel": "nome opcional do item de menu",
  "entityLabels": { "campo": "rótulo" },
  "customFields": [{ "key": "snake_case", "label": "rótulo", "type": "text|number|date" }],
  "kanban": [{ "id": "snake_case", "title": "nome da coluna" }],
  "summary": "frase curta opcional"
}
Regras:
- Retorne só chaves relevantes para o módulo pedido.
- Se o módulo não tiver entidade (ex.: notas), pode devolver apenas moduleLabel e/ou summary.
- Para kanban, devolva apenas quando o módulo for leads/deals/tasks.
- Não explique; apenas JSON.`;

function isAllowedModule(v: string): v is (typeof MODULES)[number] {
  return (MODULES as readonly string[]).includes(v);
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const moduleRaw = typeof body.module === "string" ? body.module.trim() : "";
  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!isAllowedModule(moduleRaw)) {
    return NextResponse.json({ error: "Módulo inválido." }, { status: 400 });
  }
  if (instruction.length < 6) {
    return NextResponse.json(
      { error: "Descreva a personalização com pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configure OPENAI_API_KEY no servidor." },
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

  const entity = MODULE_ENTITY[moduleRaw];
  const prompt = `Módulo alvo: ${moduleRaw}\nNome padrão: ${MODULE_LABEL_FALLBACK[moduleRaw]}\nEntidade: ${entity ?? "nenhuma"}\nPedido do utilizador: ${instruction}`;

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
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("OpenAI module customize error", t);
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
      { error: "Resposta da IA inválida. Tente novamente." },
      { status: 502 }
    );
  }

  const prevSchema = asObject(active.ai_schema);
  const nextSchema: Record<string, unknown> = { ...prevSchema };

  const prevModuleLabels = asObject(prevSchema.moduleLabels);
  const moduleLabel = parsed.moduleLabel;
  if (typeof moduleLabel === "string" && moduleLabel.trim()) {
    nextSchema.moduleLabels = {
      ...prevModuleLabels,
      [moduleRaw]: moduleLabel.trim().slice(0, 60),
    };
  }

  if (entity) {
    const prevEntityLabels = asObject(prevSchema.entityLabels);
    const prevEntityMap = asObject(prevEntityLabels[entity]);
    const nextEntityMap = asObject(parsed.entityLabels);
    if (Object.keys(nextEntityMap).length > 0) {
      nextSchema.entityLabels = {
        ...prevEntityLabels,
        [entity]: { ...prevEntityMap, ...nextEntityMap },
      };
    }

    if (Array.isArray(parsed.customFields)) {
      const prevCustomFields = asObject(prevSchema.customFields);
      nextSchema.customFields = {
        ...prevCustomFields,
        [entity]: parsed.customFields,
      };
    }
  }

  if (
    (moduleRaw === "leads" || moduleRaw === "deals" || moduleRaw === "tasks") &&
    Array.isArray(parsed.kanban)
  ) {
    const prevKanban = asObject(prevSchema.kanban);
    nextSchema.kanban = {
      ...prevKanban,
      [moduleRaw]: parsed.kanban,
    };
  }

  const summary = parsed.summary;
  if (typeof summary === "string" && summary.trim()) {
    nextSchema.summary = summary.trim().slice(0, 260);
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      ai_schema: nextSchema,
      updated_at: new Date().toISOString(),
    })
    .eq("id", active.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/app", "layout");
  revalidatePath(`/app/${moduleRaw}`);
  return NextResponse.json({ ok: true, schema: nextSchema });
}
