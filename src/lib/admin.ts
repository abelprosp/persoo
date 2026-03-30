import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

function adminEmailsFromEnv(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Super admin: email em SUPER_ADMIN_EMAILS ou flag na tabela profiles. */
export async function isSuperAdmin(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<boolean> {
  if (!user?.id) return false;
  const email = user.email?.toLowerCase();
  if (email && adminEmailsFromEnv().has(email)) return true;

  const { data } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(data?.is_super_admin);
}

export async function requireSuperAdmin(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<void> {
  if (!(await isSuperAdmin(supabase, user))) {
    throw new Error("Acesso reservado a administradores");
  }
}
