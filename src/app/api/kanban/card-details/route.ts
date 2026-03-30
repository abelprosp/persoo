import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { parseCardEnrichment, rowToCardEnrichment } from "@/lib/card-enrichment";

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

  const { data: columnHistory, error: historyError } = await supabase
    .from("card_column_history")
    .select("id,column_id,entered_at,exited_at,duration_seconds")
    .eq("workspace_id", active.id)
    .eq("entity_type", variant)
    .eq("entity_id", id)
    .order("entered_at", { ascending: false })
    .limit(200);
  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  const { data: enrRow, error: enrError } = await supabase
    .from("card_enrichments")
    .select("checklists,documents,team_members,labels")
    .eq("workspace_id", active.id)
    .eq("entity_type", variant)
    .eq("entity_id", id)
    .maybeSingle();
  if (enrError) {
    return NextResponse.json({ error: enrError.message }, { status: 500 });
  }

  const enrichment = enrRow
    ? rowToCardEnrichment(enrRow)
    : null;

  return NextResponse.json({
    row,
    notes: notes ?? [],
    activities: activities ?? [],
    columnHistory: columnHistory ?? [],
    enrichment,
  });
}

export async function POST(req: Request) {
  const auth = await getAuthWorkspace();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as {
    action?:
      | "add_note"
      | "add_activity"
      | "save_enrichment"
      | "toggle_checklist_item";
    variant?: Variant;
    id?: string;
    title?: string;
    content?: string;
    kind?: string;
    description?: string;
    enrichment?: unknown;
    checklistId?: string;
    itemId?: string;
  };

  const action = body.action;
  const variant = body.variant;
  const id = String(body.id ?? "").trim();
  if (!action || !variant || !id) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { supabase, active, user } = auth;
  const {
    data: profile,
  } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const authorName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Utilizador";

  if (action === "save_enrichment") {
    const parsed = parseCardEnrichment(body.enrichment ?? {});
    const now = new Date().toISOString();
    const { error } = await supabase.from("card_enrichments").upsert(
      {
        workspace_id: active.id,
        entity_type: variant,
        entity_id: id,
        checklists: parsed.checklists,
        documents: parsed.documents,
        team_members: parsed.team_members,
        labels: parsed.labels,
        updated_at: now,
      },
      { onConflict: "workspace_id,entity_type,entity_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: actError } = await supabase.from("card_activities").insert({
      workspace_id: active.id,
      entity_type: variant,
      entity_id: id,
      kind: "enrichment",
      title: "Checklists, documentos, equipa ou etiquetas atualizados",
      description: null,
      author_name: authorName,
    });
    if (actError) return NextResponse.json({ error: actError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  if (action === "toggle_checklist_item") {
    const checklistId = String(body.checklistId ?? "").trim();
    const itemId = String(body.itemId ?? "").trim();
    if (!checklistId || !itemId) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("card_enrichments")
      .select("*")
      .eq("workspace_id", active.id)
      .eq("entity_type", variant)
      .eq("entity_id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!existing) {
      return NextResponse.json({ error: "Sem dados no card" }, { status: 404 });
    }

    const parsed = rowToCardEnrichment(existing);
    let found = false;
    outer: for (const cl of parsed.checklists) {
      if (cl.id !== checklistId) continue;
      for (const it of cl.items) {
        if (it.id === itemId) {
          it.done = !it.done;
          found = true;
          break outer;
        }
      }
    }
    if (!found) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error: upError } = await supabase
      .from("card_enrichments")
      .update({
        checklists: parsed.checklists,
        updated_at: now,
      })
      .eq("workspace_id", active.id)
      .eq("entity_type", variant)
      .eq("entity_id", id);
    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 });

    await supabase.from("card_activities").insert({
      workspace_id: active.id,
      entity_type: variant,
      entity_id: id,
      kind: "checklist_toggle",
      title: "Item de checklist marcado",
      description: null,
      author_name: authorName,
    });

    return NextResponse.json({ ok: true });
  }

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

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
