"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileFullName(
  fullName: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trimmed = fullName.trim();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed.length > 0 ? trimmed : null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/settings/profile");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateAccountPassword(
  password: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  if (password.length < 6) {
    return { error: "A palavra-passe deve ter pelo menos 6 caracteres." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/app/settings/profile");
  return { ok: true };
}
