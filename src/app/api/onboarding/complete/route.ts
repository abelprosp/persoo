import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { transaction } from "@/lib/db/pool";
import { readJson } from "@/lib/security";
import { completeOnboardingWithRunner, onboardingInput } from "@/lib/onboarding";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const input = onboardingInput.parse(await readJson(request, 16384));
    const { active } = await getWorkspaceContext(db, user.id);
    if (!active) return NextResponse.json({ error: "Espaço de trabalho não encontrado." }, { status: 404 });
    const result = await transaction(null, run => completeOnboardingWithRunner(run, user.id, active.id, input));
    revalidatePath("/app", "layout");
    revalidatePath("/onboarding");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Revise seu nome, empresa e modo de configuração." : error instanceof Error ? error.message : "Não foi possível concluir." }, { status: 400 });
  }
}
