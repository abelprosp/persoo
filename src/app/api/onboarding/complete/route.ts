import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  getCrmTemplateSchema,
  isCrmTemplateId,
  type CrmTemplateId,
} from "@/lib/crm-templates";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  fullName?: string;
  companyName?: string;
  mode?: "template" | "ai";
  templateId?: string;
  description?: string;
};

const PRESERVED_SCHEMA_KEYS = [
  "dashboard",
  "ai_customize_trial_used",
  "ai_customize_pro_used",
  "ai_customize_pro_month",
] as const;

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const fullName = (body.fullName ?? "").trim();
  const companyName = (body.companyName ?? "").trim();
  const mode = body.mode;
  const description = (body.description ?? "").trim();

  if (fullName.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (companyName.length < 2) {
    return NextResponse.json(
      { error: "Informe o nome da empresa." },
      { status: 400 }
    );
  }
  if (mode !== "template" && mode !== "ai") {
    return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
  }

  let validatedTemplateId: CrmTemplateId | undefined;
  if (mode === "template") {
    const tid = (body.templateId ?? "").trim();
    if (!isCrmTemplateId(tid)) {
      return NextResponse.json({ error: "Template inválido." }, { status: 400 });
    }
    validatedTemplateId = tid;
  }

  if (mode === "ai" && description.length < 8) {
    return NextResponse.json(
      { error: "Descreva a operação com pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) {
    return NextResponse.json(
      { error: "Espaço de trabalho não encontrado." },
      { status: 404 }
    );
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      company_name: companyName,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileUpdate.error) {
    return NextResponse.json(
      { error: profileUpdate.error.message },
      { status: 500 }
    );
  }

  const wsPatch: Record<string, unknown> = {
    name: companyName,
    updated_at: new Date().toISOString(),
  };

  if (mode === "template") {
    const templateId = validatedTemplateId;
    if (!templateId) {
      return NextResponse.json({ error: "Template inválido." }, { status: 400 });
    }
    const prev = toRecord(active.ai_schema);
    const template = toRecord(getCrmTemplateSchema(templateId));
    const templateKanban = toRecord(template.kanban);
    const prevKanban = toRecord(prev.kanban);
    const nextKanban: Record<string, unknown> = { ...prevKanban };
    if (Array.isArray(templateKanban.leads)) nextKanban.leads = templateKanban.leads;
    if (Array.isArray(templateKanban.deals)) nextKanban.deals = templateKanban.deals;
    if (Array.isArray(templateKanban.tasks)) nextKanban.tasks = templateKanban.tasks;

    const templateRest = { ...template };
    delete templateRest.kanban;
    const industry =
      typeof template.industry === "string" && template.industry.trim()
        ? template.industry.trim()
        : "Geral";

    const nextSchema: Record<string, unknown> = {
      ...templateRest,
      industry,
      kanban: nextKanban,
    };
    for (const key of PRESERVED_SCHEMA_KEYS) {
      if (key in prev) nextSchema[key] = prev[key];
    }
    wsPatch.industry = industry;
    wsPatch.ai_schema = nextSchema;
  }

  const wsUpdate = await supabase
    .from("workspaces")
    .update(wsPatch)
    .eq("id", active.id);
  if (wsUpdate.error) {
    return NextResponse.json({ error: wsUpdate.error.message }, { status: 500 });
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/settings/ai");

  return NextResponse.json({ ok: true });
}
