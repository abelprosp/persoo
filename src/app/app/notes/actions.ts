"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { error: string };

export async function createNote(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Não autenticado" };
  }

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) {
    return { error: "Espaço de trabalho não encontrado" };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Indique o título da nota" };
  }

  const content = String(formData.get("content") ?? "").trim() || null;
  const authorOverride = String(formData.get("author_name") ?? "").trim();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const author_name =
    authorOverride ||
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Utilizador";

  const now = new Date().toISOString();

  const { error } = await supabase.from("notes").insert({
    workspace_id: active.id,
    title,
    content,
    author_name,
    updated_at: now,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/notes");
  return { ok: true };
}

export async function updateNote(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const author_name = String(formData.get("author_name") ?? "").trim() || null;

  if (!id) return { error: "Nota inválida" };
  if (!title) return { error: "Indique o título da nota" };

  const { error } = await supabase
    .from("notes")
    .update({
      title,
      content,
      author_name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/notes");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) return { error: "Espaço de trabalho não encontrado" };

  const noteId = String(id ?? "").trim();
  if (!noteId) return { error: "Nota inválida" };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("workspace_id", active.id);

  if (error) return { error: error.message };

  revalidatePath("/app/notes");
  return { ok: true };
}
