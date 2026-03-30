import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) {
    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
  }

  const wid = ws.id;

  const tables = [
    "tasks",
    "notes",
    "deals",
    "leads",
    "contacts",
    "organizations",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("workspace_id", wid);
    if (error) {
      console.error("clear-demo", table, error.message);
      return NextResponse.json(
        { error: `Falha ao limpar ${table}: ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
