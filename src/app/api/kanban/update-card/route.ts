import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type Variant = "lead" | "deal" | "task";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) {
    return NextResponse.json(
      { error: "Espaço de trabalho não encontrado" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    variant?: Variant;
    id?: string;
    payload?: Record<string, unknown>;
  };
  const variant = body.variant;
  const id = String(body.id ?? "").trim();
  const payload = body.payload ?? {};
  if (!variant || !id) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  if (variant === "lead") {
    const update = {
      full_name: String(payload.full_name ?? "").trim(),
      company: String(payload.company ?? "").trim() || null,
      email: String(payload.email ?? "").trim() || null,
      phone: String(payload.phone ?? "").trim() || null,
      owner_name: String(payload.owner_name ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (!update.full_name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }
    const { error } = await supabase
      .from("leads")
      .update(update)
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (variant === "deal") {
    const rawValue = String(payload.value ?? "").trim();
    const parsed = rawValue === "" ? null : Number(rawValue.replace(",", "."));
    if (parsed !== null && Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }
    const update = {
      title: String(payload.title ?? "").trim(),
      organization_name: String(payload.organization_name ?? "").trim() || null,
      email: String(payload.email ?? "").trim() || null,
      phone: String(payload.phone ?? "").trim() || null,
      assignee_name: String(payload.assignee_name ?? "").trim() || null,
      value: parsed,
      updated_at: new Date().toISOString(),
    };
    if (!update.title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }
    const { error } = await supabase
      .from("deals")
      .update(update)
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const dueRaw = String(payload.due_at ?? "").trim();
    const due_at = dueRaw === "" ? null : new Date(dueRaw).toISOString();
    if (dueRaw && Number.isNaN(new Date(dueRaw).getTime())) {
      return NextResponse.json({ error: "Prazo inválido" }, { status: 400 });
    }
    const update = {
      title: String(payload.title ?? "").trim(),
      priority: String(payload.priority ?? "medium").trim() || "medium",
      assignee_name: String(payload.assignee_name ?? "").trim() || null,
      due_at,
      updated_at: new Date().toISOString(),
    };
    if (!update.title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }
    const { error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
