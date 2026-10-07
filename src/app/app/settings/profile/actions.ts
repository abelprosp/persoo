"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { passwordSchema } from "@/lib/security";
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

  if (!passwordSchema.safeParse(password).success) {
    return { error: "Use uma senha entre 12 e 128 caracteres." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  (await cookies()).delete(SESSION_COOKIE);

  revalidatePath("/app/settings/profile");
  return { ok: true };
}
