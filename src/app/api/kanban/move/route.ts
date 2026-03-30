import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type Variant = "lead" | "deal" | "task";

async function currentColumn(
  variant: Variant,
  id: string,
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  if (variant === "lead") {
    const { data } = await supabase
      .from("leads")
      .select("status")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return (data?.status as string | null) ?? null;
  }
  if (variant === "deal") {
    const { data } = await supabase
      .from("deals")
      .select("stage")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return (data?.stage as string | null) ?? null;
  }
  const { data } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data?.status as string | null) ?? null;
}

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
    fromColumn?: string;
    toColumn?: string;
  };

  const variant = body.variant;
  const id = String(body.id ?? "").trim();
  const fromColumn = String(body.fromColumn ?? "").trim();
  const toColumn = String(body.toColumn ?? "").trim();
  if (!variant || !id || !toColumn) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const {
    data: profile,
  } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const authorName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Utilizador";
  const actualFrom = (await currentColumn(variant, id, active.id, supabase)) ?? fromColumn;

  if (actualFrom && actualFrom === toColumn) {
    return NextResponse.json({ ok: true });
  }

  if (variant === "lead") {
    const { error } = await supabase
      .from("leads")
      .update({
        status: toColumn,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (variant === "deal") {
    const { error } = await supabase
      .from("deals")
      .update({
        stage: toColumn,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("tasks")
      .update({ status: toColumn, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", active.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: activityError } = await supabase.from("card_activities").insert({
    workspace_id: active.id,
    entity_type: variant,
    entity_id: id,
    kind: "move",
    title: "Card movido de coluna",
    description: fromColumn
      ? `Movido de "${fromColumn}" para "${toColumn}".`
      : `Movido para "${toColumn}".`,
    author_name: authorName,
    meta: { from: fromColumn || null, to: toColumn },
  });
  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("card_column_history")
    .update({ exited_at: nowIso })
    .eq("workspace_id", active.id)
    .eq("entity_type", variant)
    .eq("entity_id", id)
    .is("exited_at", null);

  const { error: historyError } = await supabase.from("card_column_history").insert({
    workspace_id: active.id,
    entity_type: variant,
    entity_id: id,
    column_id: toColumn,
    entered_at: nowIso,
  });
  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
