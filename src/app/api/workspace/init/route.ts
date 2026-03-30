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
    return NextResponse.json({ error: "Workspace" }, { status: 500 });
  }

  return NextResponse.json({ workspace: ws });
}
