import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type Variant = "lead" | "deal" | "task";

function parseVariant(v: string | null): Variant | null {
  if (v === "lead" || v === "deal" || v === "task") return v;
  return null;
}

async function getAuthWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", status: 401 as const };
  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado", status: 404 as const };
  return { supabase, user, active } as const;
}

export async function GET(req: Request) {
  const auth = await getAuthWorkspace();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const variant = parseVariant(url.searchParams.get("variant"));
  const id = String(url.searchParams.get("id") ?? "").trim();
  if (!variant || !id) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { supabase, active } = auth;
  let row: Record<string, unknown> | null = null;

  if (variant === "lead") {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", active.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    row = (data as Record<string, unknown> | null) ?? null;
  } else if (variant === "deal") {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", active.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    row = (data as Record<string, unknown> | null) ?? null;
  } else {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", active.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    row = (data as Record<string, unknown> | null) ?? null;
  }

  if (!row) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

  const { data: notes, error: notesError } = await supabase
    .from("card_notes")
    .select("id,title,content,author_name,created_at,updated_at")
    .eq("workspace_id", active.id)
    .eq("entity_type", variant)
    .eq("entity_id", id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (notesError) return NextResponse.json({ error: notesError.message }, { status: 500 });

  const { data: activities, error: actError } = await supabase
    .from("card_activities")
    .select("id,kind,title,description,author_name,meta,created_at")
    .eq("workspace_id", active.id)
    .eq("entity_type", variant)
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (actError) return NextResponse.json({ error: actError.message }, { status: 500 });

  return NextResponse.json({ row, notes: notes ?? [], activities: activities ?? [] });
}

export async function POST(req: Request) {
  const auth = await getAuthWorkspace();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "add_note" | "add_activity";
    variant?: Variant;
    id?: string;
    title?: string;
    content?: string;
    kind?: string;
    description?: string;
  };

  const action = body.action;
  const variant = body.variant;
  const id = String(body.id ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!action || !variant || !id || !title) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { supabase, active, user } = auth;
  const {
    data: profile,
  } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const authorName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Utilizador";

  if (action === "add_note") {
    const content = String(body.content ?? "").trim() || null;
    const now = new Date().toISOString();
    const { error } = await supabase.from("card_notes").insert({
      workspace_id: active.id,
      entity_type: variant,
      entity_id: id,
      title,
      content,
      author_name: authorName,
      created_at: now,
      updated_at: now,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("card_activities").insert({
      workspace_id: active.id,
      entity_type: variant,
      entity_id: id,
      kind: "note",
      title: `Nota: ${title}`,
      description: content,
      author_name: authorName,
    });

    return NextResponse.json({ ok: true });
  }

  const description = String(body.description ?? "").trim() || null;
  const kind = String(body.kind ?? "manual").trim() || "manual";
  const { error } = await supabase.from("card_activities").insert({
    workspace_id: active.id,
    entity_type: variant,
    entity_id: id,
    kind,
    title,
    description,
    author_name: authorName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
