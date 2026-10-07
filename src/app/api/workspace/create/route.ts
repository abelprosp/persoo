import { createClient } from "@/lib/supabase/server";
import { provisionWorkspace } from "@/lib/workspace-provisioning";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-cookie";
import { readJson } from "@/lib/security";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const body = z.object({ name: z.string().trim().min(1).max(120).default("Novo espaço") }).parse(await readJson(request, 4096));
    const workspace = await provisionWorkspace(user.id, body.name);
    const response = NextResponse.json({ workspace });
    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Nome do espaço inválido." : error instanceof Error ? error.message : "Não foi possível criar o espaço." }, { status: 400 });
  }
}
