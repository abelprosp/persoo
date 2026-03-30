import { createClient } from "@/lib/supabase/server";
import { attachTrialToWorkspace } from "@/lib/subscriptions";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const name = rawName.length > 0 ? rawName.slice(0, 120) : "Novo espaço";

  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      owner_id: user.id,
      industry: "Geral",
    })
    .select("id, name, industry, ai_schema")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar espaço" },
      { status: 500 }
    );
  }

  const { error: memErr } = await supabase.from("workspace_members").insert({
    workspace_id: created.id,
    user_id: user.id,
    role: "owner",
  });

  if (memErr) {
    return NextResponse.json(
      { error: memErr.message },
      { status: 500 }
    );
  }

  await attachTrialToWorkspace(supabase, created.id);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, created.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ workspace: created });
}
